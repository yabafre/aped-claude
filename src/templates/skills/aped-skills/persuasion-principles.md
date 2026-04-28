# APED Skill Authoring — Persuasion Principles (Reference)

> Reference document. No `description:` triggers — read on demand from other APED skills (e.g. `/aped-claude` when generating new skills, `/aped-retro` when explaining why an Iron Law works).

## Contents

- Why persuasion in skills (Meincke et al. 2025 attribution)
- The seven principles table
- Authority / Commitment / Scarcity / Social Proof / Unity — usage examples
- Reciprocity and Liking — when to avoid
- Principle combinations by skill type
- Why this works (psychology behind Iron Laws)
- Ethical use test
- Research citations

## Overview

LLMs respond to the same persuasion principles as humans. Understanding this psychology helps you design more effective APED skills — not to manipulate, but to ensure critical practices are followed even under pressure.

**Research foundation:** Meincke, L., Shapiro, D., Duckworth, A. L., Mollick, E., Mollick, L., & Cialdini, R. (2025). *Call Me A Jerk: Persuading AI to Comply with Objectionable Requests.* University of Pennsylvania. Tested 7 persuasion principles with N=28,000 AI conversations. Persuasion techniques **more than doubled compliance rates (33% → 72%, p < .001)**.

This is the empirical basis for APED's "Iron Law" rhetorical pattern — imperative authority language is what makes the rules survive when the agent is tempted to break them.

## The seven principles

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Authority** | Deference to expertise, credentials, or official sources. |
| 2 | **Commitment** | Consistency with prior actions, statements, or public declarations. |
| 3 | **Scarcity** | Urgency from time limits or limited availability. |
| 4 | **Social Proof** | Conformity to what others do or what's considered normal. |
| 5 | **Unity** | Shared identity, "we-ness", in-group belonging. |
| 6 | **Reciprocity** | Obligation to return benefits received. |
| 7 | **Liking** | Preference for cooperating with those we like. |

## Principle-by-principle usage

### 1. Authority

**What it is:** Deference to expertise, credentials, or official sources.

**How it works in skills:**
- Imperative language: "YOU MUST", "Never", "Always"
- Non-negotiable framing: "No exceptions"
- Eliminates decision fatigue and rationalization

**When to use:**
- Discipline-enforcing skills (TDD, verification requirements)
- Safety-critical practices
- Established best practices

**APED applications:**
- `/aped-dev`'s Iron Law: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST."
- `/aped-review`'s Iron Law: "NO PASS WITHOUT FRESH EVIDENCE IN THIS MESSAGE."
- `/aped-debug`'s Iron Law: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST."

**Example:**
```markdown
✅ Write code before test? Delete it. Start over. No exceptions.
❌ Consider writing tests first when feasible.
```

### 2. Commitment

**What it is:** Consistency with prior actions, statements, or public declarations.

**How it works in skills:**
- Require announcements: "Announce skill usage"
- Force explicit choices: "Choose A, B, or C"
- Use tracking: TodoWrite for checklists

**When to use:**
- Ensuring skills are actually followed
- Multi-step processes
- Accountability mechanisms

**APED applications:**
- The `[F]ix` / `[O]verride` user gate in `/aped-review` — explicit choice, recorded reason.
- `/aped-brainstorm` energy checkpoint `[K] / [S] / [P] / [D]` — user picks; default if silent is `[K]`.
- TaskCreate / TaskUpdate cycle in every skill that has a checklist.

**Example:**
```markdown
✅ When you find a skill, you MUST announce: "I'm using [Skill Name]"
❌ Consider letting your partner know which skill you're using.
```

### 3. Scarcity

**What it is:** Urgency from time limits or limited availability.

**How it works in skills:**
- Time-bound requirements: "Before proceeding"
- Sequential dependencies: "Immediately after X"
- Prevents procrastination

**When to use:**
- Immediate verification requirements
- Time-sensitive workflows
- Preventing "I'll do it later"

**APED applications:**
- `/aped-dev`'s "Verification gate (run before Completion)" — fresh evidence in **this** message, not next session.
- `/aped-debug`'s 3-failed-fixes rule — STOP at attempt 3, don't try fix 4.

**Example:**
```markdown
✅ After completing a task, IMMEDIATELY request code review before proceeding.
❌ You can review code when convenient.
```

### 4. Social Proof

**What it is:** Conformity to what others do or what's considered normal.

**How it works in skills:**
- Universal patterns: "Every time", "Always"
- Failure modes: "X without Y = failure"
- Establishes norms

**When to use:**
- Documenting universal practices
- Warning about common failures
- Reinforcing standards

**APED applications:**
- `/aped-story`'s Reader persona ("the enthusiastic junior with poor taste") — establishes the universal failure mode.
- `/aped-review`'s "Don't rubber-stamp" anti-pattern — names what every undisciplined reviewer does.

**Example:**
```markdown
✅ Checklists without TodoWrite tracking = steps get skipped. Every time.
❌ Some people find TodoWrite helpful for checklists.
```

### 5. Unity

**What it is:** Shared identity, "we-ness", in-group belonging.

**How it works in skills:**
- Collaborative language: "our codebase", "we're colleagues"
- Shared goals: "we both want quality"

**When to use:**
- Collaborative workflows
- Establishing team culture
- Non-hierarchical practices

**APED applications:**
- `/aped-review` specialist personas (Marcus, Eva, Diego, Lucas, Aria, Kai, Sam) — named team members with defining traits make the review feel like a council, not a tribunal.
- `/aped-dev`'s fullstack team mode (Kenji + Amelia + Leo) — same pattern, applied to implementation.

**Example:**
```markdown
✅ We're colleagues working together. I need your honest technical judgment.
❌ You should probably tell me if I'm wrong.
```

### 6. Reciprocity

**What it is:** Obligation to return benefits received.

**How it works:**
- Use sparingly — can feel manipulative.
- Rarely needed in skills.

**When to avoid:** Almost always. Other principles are more effective and don't carry the manipulative undertone.

### 7. Liking

**What it is:** Preference for cooperating with those we like.

**How it works:**
- **DON'T USE for compliance.**
- Conflicts with honest feedback culture.
- Creates sycophancy.

**When to avoid:** Always for discipline enforcement. APED's "no performative agreement" rule in `/aped-receive-review` is the explicit reaction to Liking-driven sycophancy ("You're absolutely right!").

## Principle combinations by skill type

| Skill type | Use | Avoid |
|------------|-----|-------|
| **Discipline-enforcing** (`/aped-dev`, `/aped-review`, `/aped-debug`, `/aped-receive-review`) | Authority + Commitment + Social Proof | Liking, Reciprocity |
| **Guidance/technique** (`/aped-arch`, `/aped-prd`) | Moderate Authority + Unity | Heavy authority |
| **Collaborative** (`/aped-brainstorm`, `/aped-story` user gate) | Unity + Commitment | Authority, Liking |
| **Reference** (this file, `anthropic-best-practices.md`, `testing-skills-with-subagents.md`) | Clarity only | All persuasion |

## Why this works: the psychology

### Bright-line rules reduce rationalization

- "YOU MUST" removes decision fatigue.
- Absolute language eliminates "is this an exception?" questions.
- Explicit anti-rationalization counters close specific loopholes — see APED's Rationalizations tables.

### Implementation intentions create automatic behavior

- Clear triggers + required actions = automatic execution.
- "When X, do Y" more effective than "generally do Y".
- Reduces cognitive load on compliance.

### LLMs are parahuman

- Trained on human text containing these patterns.
- Authority language **precedes compliance** in training data.
- Commitment sequences (statement → action) are frequently modeled.
- Social proof patterns (everyone does X) establish norms.

This is why APED's Iron Laws are written in imperative caps with no qualifiers, and why every skill has a Red Flags table (Authority + Social Proof) and a Rationalizations table (closing specific loopholes one at a time).

## Ethical use

**Legitimate:**
- Ensuring critical practices are followed.
- Creating effective documentation.
- Preventing predictable failures.

**Illegitimate:**
- Manipulating for personal gain.
- Creating false urgency.
- Guilt-based compliance.

**The test:** Would this technique serve the user's genuine interests if they fully understood it?

APED skills are built for the user (the human partner running the project), not for the LLM. The persuasion is on the LLM, in service of the user's outcome (correct, tested, reviewed code). If a persuasion technique would lose the user's trust if they could see it being applied, it fails the test.

## Research citations

**Cialdini, R. B. (2021).** *Influence: The Psychology of Persuasion (New and Expanded).* Harper Business.
- Seven principles of persuasion.
- Empirical foundation for influence research.

**Meincke, L., Shapiro, D., Duckworth, A. L., Mollick, E., Mollick, L., & Cialdini, R. (2025).** *Call Me A Jerk: Persuading AI to Comply with Objectionable Requests.* University of Pennsylvania.
- Tested 7 principles with N=28,000 LLM conversations.
- Compliance increased 33% → 72% with persuasion techniques.
- Authority, commitment, scarcity most effective.
- Validates the parahuman model of LLM behaviour.

## Quick reference

When designing or auditing an APED skill, ask:

1. **What type is it?** (Discipline / guidance / collaborative / reference)
2. **What behaviour am I trying to change?**
3. **Which principles apply?** (Usually Authority + Commitment for discipline)
4. **Am I combining too many?** (Don't stack all seven — the message dilutes)
5. **Is this ethical?** (Would the user endorse it if they read the skill?)

A skill that passes those five questions is bulletproof on the compliance axis. The next axis — does it work under maximum pressure? — is what `testing-skills-with-subagents.md` covers.
