---
name: aped-brainstorm
keep-coding-instructions: true
description: 'Use when user says "brainstorm", "ideate", "generate ideas", "divergent thinking", or invokes aped-brainstorm. Horizontal — invokable at any phase.'
when_to_use: 'Use when user says "brainstorm", "help me ideate", "explore ideas". Runs before aped-analyze when the idea is still fuzzy.'
argument-hint: "[topic]"
allowed-tools: Read Write Edit Glob Grep Bash TaskCreate TaskUpdate
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Brainstorm — Divergent Ideation Before Convergence

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

- NEVER organize or converge before the divergence quota is met — stay in generative mode
- NEVER accept "I think that's enough" before 50 ideas — the magic is in ideas 50-100
- **NEVER generate ideas in silent batches.** Present **one** technique element at a time, HALT, react to the user, then move on. Brainstorming is a **dialogue**, not a generation script.
- Shift creative domain every 10 ideas to fight LLM semantic clustering bias
- Capture every idea verbatim, even the bad ones — they feed better ones
- No time estimates, no effort sizing during brainstorm — that's for later phases

## Guiding Principles

### 1. Quantity Before Quality
The first 20 ideas are obvious. Ideas 20-50 require effort. Ideas 50-100 are where the breakthrough lives. Never settle before the quota — push through the "I've run out of ideas" wall at least twice.

### 2. Anti-Bias Protocol
LLMs drift toward semantic clustering (similar ideas chain together). Every 10 ideas, force an orthogonal domain shift: if you've been in technical, pivot to UX. If UX, pivot to business model. If business model, pivot to edge cases or black swans.

### 3. Help the User Think, Don't Just Ask
Many users know what they want but struggle to articulate. Your job is to offer concrete suggestions they can react to, not just repeat "what else?" When stuck, draft 2-3 alternatives yourself — the user sharpens faster with something to push against than with silence.

### 4. Divergence First, Convergence Later
Resist the urge to evaluate, prioritize, or cluster during divergence. Write ideas down, keep moving. Convergence is a separate phase at the end.

## Setup

1. Check for an existing session file: `{{OUTPUT_DIR}}/brainstorm/session-{date}.md`
   - If one exists and is <7 days old: ask user — resume or start fresh?
2. Ensure output directory exists:
   ```bash
   mkdir -p {{OUTPUT_DIR}}/brainstorm
   ```
3. If the user passed a topic argument, use it. Otherwise ask: "What are we brainstorming today? One sentence."

## Phase 1: Framing

Before diverging, lock the frame in 3 questions (adapt to `communication_language`):

- **Target:** What are we generating ideas about? (a feature, a business model, a technical approach, a user persona?)
- **Lens:** From whose perspective? (user, business, engineer, skeptic?)
- **Constraints:** Any hard constraints to keep in mind? (none, a specific platform, a budget, a deadline)

Write the frame at the top of `{{OUTPUT_DIR}}/brainstorm/session-{date}.md`:
```markdown
# Brainstorm — {topic}
Date: {date}
Target: {what}
Lens: {perspective}
Constraints: {list}
Techniques used: []
Total ideas: 0
```

⏸ **GATE: Confirm the frame with the user before diverging.**

## Phase 2: Technique Selection

Pick a technique based on the frame. Suggest 3 options, let the user pick one. If they're unsure, pick for them and explain why.

### Technique Library

| Technique | Best For | How It Works |
|---|---|---|
| **SCAMPER** | Improving an existing concept | Substitute / Combine / Adapt / Modify / Put to other use / Eliminate / Reverse — 7 lenses |
| **What If Scenarios** | Exploring possibility space | "What if X were 10x cheaper?" "What if users had infinite time?" Push extremes |
| **Reverse Engineering** | Goal is clear, path is not | Start from desired end state, walk backwards to now |
| **Random Input Stimulus** | Stuck in a rut | Pick a random word/concept, force connections to the topic |
| **5 Whys** | Root-causing a problem | Start with the symptom, ask why 5 times |
| **First Principles** | Breaking received wisdom | Strip assumptions, rebuild from physics/logic |
| **Pre-mortem** | Evaluating risk | Imagine it's 1 year from now and this failed — why? |
| **Genre Mashup** | Seeking novelty | Combine 2 unrelated domains (e.g., "restaurant" + "dungeon crawl") |
| **Customer Support Theater** | Finding pain points | Roleplay an angry user and a support rep |
| **Time Traveler Council** | Long-term thinking | Past-you and future-you advise present-you |

Log the chosen technique in the session file.

## Phase 3: Interactive Facilitation (one element at a time)

This phase is **a coaching dialogue, not a generation script.** You are a creative facilitator: present **one** technique element, **HALT**, react to the user's response, build on it, then move to the next element. Batches of generated ideas without user reaction defeat the purpose — the magic of brainstorming lives in the back-and-forth.

### Quota

- **Minimum:** 50 ideas captured during interactive facilitation
- **Target:** 100 ideas
- **Hard stop:** user picks `[D]` (Done) on the technique menu OR `[C]` (Converge) on the energy checkpoint AND quota ≥ 50

### Idea capture format

Every idea you capture (from your prompt or from the user's reaction) goes into the session file under the active technique heading using:

```markdown
**[Category #N]** {Mnemonic Title}
- Concept: {2-3 sentence description}
- Novelty: {what makes this different from the obvious answer}
```

### Per-technique facilitation loop

For the technique the user picked in Phase 2:

#### Step 3.1 — Present ONE element

Open the technique with **one** prompt at a time. Do NOT enumerate all 7 SCAMPER lenses upfront, do NOT generate 10 What-If scenarios in one shot. Pick the first element, frame it in one sentence, ask one open question.

> Example (SCAMPER → Substitute): "What's one thing in the current overlay role that, if you swapped it for something completely different, would change the product's identity? No filter — first thing that comes to mind?"

⏸ **HALT — wait for the user's response. Do not generate ideas before they speak.**

#### Step 3.2 — Coach based on their response

Switch on the depth of what the user said:

- **Basic answer** ("I dunno, maybe X") → dig: "Tell me more about {aspect}. What would that look like in practice? When would a user notice the difference?"
- **Detailed answer** (a real concept, even rough) → build: "I love that {specific insight}. What if we pushed it further — what's the {extension / inversion / extreme version} of that?" Then add **one** AI-generated extension idea on top of theirs (your contribution to the dialogue, not a flood of 10 alternatives).
- **Stuck** ("I don't know") → seed: "No worries. Let me suggest an angle: {one concrete starting point tied to their frame}. Reaction — yes / no / shift?"

Capture each idea (theirs or yours) in the IDEA TEMPLATE format.

#### Step 3.3 — Energy checkpoint (every 4-5 exchanges)

After roughly every 4-5 user/AI exchanges, briefly check engagement before plowing on:

> "We've captured {N} ideas so far across {short list of themes}. Quick check:
> [K] Keep pushing this angle (one more element of the same technique)
> [S] Switch to the next technique element
> [P] Pivot — anti-bias forces an orthogonal domain (technical → UX → business → edge case)
> [D] Done with this technique → end-of-technique menu"

⏸ **HALT — do not pick for the user.** Default if user is silent or says "continue" → `[K]`.

#### Step 3.4 — Anti-bias domain pivot (auto every 10 ideas)

Independent of the user-driven energy checkpoint: every 10 ideas captured, **internally** check what domain the recent ideas cluster in and force the next prompt into an orthogonal domain. Announce the pivot to the user:

> "We've stacked up on the {detected} angle. I'm going to pivot us to {orthogonal angle: user / business / infra / legal / brand} for the next element — fresh lens helps avoid semantic clustering."

This is automatic, not a HALT — it shapes your next Step 3.1 prompt.

### End-of-technique menu

When the technique has covered all its core elements (or the user picks `[D]` Done in Step 3.3), present:

```
Technique {name} complete — {N} ideas captured.

Choose next move:
[K] Keep exploring this technique (you have ideas left)
[T] Try a different technique (suggest 2-3 from the library that pair well with what we found)
[A] Advanced elicitation — call aped-elicit on the strongest 1-2 ideas (deep critique, sharpening)
[B] Take a break (save and pause; resume by re-running aped-brainstorm)
[C] Converge — quota met or close enough → Phase 4
```

⏸ **HALT — wait for user choice.** Default suggestion: if quota < 50, prefer `[K]` or `[T]`; if ≥ 50, all options are reasonable, let user decide.

### When the user freezes mid-loop

If the user gives 2 consecutive empty / "I don't know" responses on the same element:

- Drop the element and offer 3 concrete alternatives they can react to
- OR suggest a technique switch via `[T]`
- OR inject a random stimulus from a different field ("pick a random word: 'lighthouse'. Force a connection to {topic}")

### When YOU freeze (no decent prompt comes out)

- Shift the lens (user → business → engineer → skeptic)
- Shift the time horizon (now → 1 year → 10 years → 100 years)
- Shift the scale (one user → a million users → one user with infinite resources)

## Phase 4: Convergence

Only once the quota is hit AND the user calls time:

1. **Cluster** — group similar ideas (you do this, not the user — they're tired)
2. **Rank** — for each cluster, pick the 1-2 strongest by a simple criterion the user chooses (novelty, feasibility, impact)
3. **Ground each survivor before recommending it.** Pocock workshop convergence trap (superpowers issue #1266 — recommendations flip when followed up because the first pass was vibing). Per-survivor table:

   | Field | Required content |
   |---|---|
   | **Assumptions** | What about the world / user / tech must be true for this to work? |
   | **Failure modes** | One sentence each on the top 2 ways this idea breaks under stress |
   | **Disqualifiers** | Conditions that would cause you to retract this from the survivor list (regulatory blocker, missing skill on the team, etc.) |
   | **Evidence basis** | Anchor in: (a) existing internal artefact (cite path), (b) external precedent (cite link), or (c) reasoning from first principles (one-line sketch). "Strong intuition" is NOT a basis. |

4. **Present** — show the user the top 5-10 ideas across clusters with the grounding table above each rationale.

⏸ **GATE: Ask the user which ideas survive. Don't over-filter — the user decides.** If the user picks an idea whose `Evidence basis` was "first principles", flag it as a candidate for `aped-grill` before downstream PRD/arch work — alignment grilling pre-empts the flip.

## Phase 5: Output

Finalize `{{OUTPUT_DIR}}/brainstorm/session-{date}.md` with:

```markdown
# Brainstorm — {topic}
Date: {date}
Target: {what}
Lens: {perspective}
Constraints: {list}
Techniques used: [{list}]
Total ideas: {N}

## Top Survivors
1. {idea} — {1-line rationale}
   - Assumptions: ...
   - Failure modes: ...
   - Disqualifiers: ...
   - Evidence basis: ...
2. ...

## Assumptions in play
- {assumption a downstream skill must verify} — based on: {source}
- ...

## Unknowns surfaced (deferred — needs human / data / external answer)
- {open question} — recommended owner: {who/what answers this}
- ...

## Out of scope (declared during brainstorm)
- {item} — reason: {one-line rationale}
- ...

## Raw Ideas (archived)
### Batch 1 — {technique}
- ...
### Batch 2 — {technique}
- ...
```

Present the file path to the user.

> **Why explicit `Assumptions in play` + `Unknowns surfaced` blocks**: superpowers issue #1098 — brainstorming sessions historically dropped the unstated decisions a downstream PRD/arch agent had to re-discover. APED requires both blocks so `aped-prd` and `aped-arch` open the brainstorm output and immediately see the implicit-vs-explicit boundary; the agents downstream **must not** treat an absent block as "no assumptions" — they verify by reading.

### Spec self-review

After writing the spec/session-output document, look at it with fresh eyes — this is an inline checklist you run yourself, not a subagent dispatch. Fix any issues inline; no need to re-review.

1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections, or vague requirements? Fix them. Bare deferrals like "later" / "when X comes up" / "someone will pick this up" without a concrete successor (a follow-up ticket ID, an `aped-grill` handoff, or an explicit `## Out of scope` entry) are placeholders too — superpowers issue #1294 (drift through unowned deferrals). Every deferral must name **who or what** answers it; if you can't, surface as an `Unknown` in Phase 5.
2. **Internal consistency:** Do any sections contradict each other? Does the architecture sketch match the feature descriptions in the survivors?
3. **Scope check:** Is this focused enough for a single implementation plan, or does it need decomposition? If multiple independent subsystems, flag for split before handing off to `aped-prd`.
4. **Ambiguity check:** Could any requirement be interpreted two different ways? If so, pick one and make it explicit.
5. **YAGNI sweep:** Any unrequested features or over-engineering survived convergence? Remove them now — every line in the spec becomes implementation cost downstream.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a missing requirement, add it.

### Spec-reviewer dispatch

After the inline self-review passes, dispatch a fresh subagent to review the spec document **before** the user gate. The reviewer's job is to verify the spec is complete, consistent, and ready for `aped-prd` / `aped-epics` planning.

Use the `Agent` tool (`subagent_type: "general-purpose"`) with this verbatim prompt (substitute `[SPEC_FILE_PATH]` with the actual path of the brainstorm spec just written):

```
You are a spec document reviewer. Verify this spec is complete and ready for planning.

**Spec to review:** [SPEC_FILE_PATH]

## What to Check

| Category | What to Look For |
|----------|------------------|
| Completeness | TODOs, placeholders, "TBD", incomplete sections |
| Consistency | Internal contradictions, conflicting requirements |
| Clarity | Requirements ambiguous enough to cause someone to build the wrong thing |
| Scope | Focused enough for a single plan — not covering multiple independent subsystems |
| YAGNI | Unrequested features, over-engineering |

## Calibration

**Only flag issues that would cause real problems during implementation planning.**
A missing section, a contradiction, or a requirement so ambiguous it could be
interpreted two different ways — those are issues. Minor wording improvements,
stylistic preferences, and "sections less detailed than others" are not.

Approve unless there are serious gaps that would lead to a flawed plan.

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

## Self-review (run before user gate)

Before handing off the brainstorm output, walk this checklist. Each `[ ]` must flip to `[x]` or HALT.

- [ ] **Placeholder lint** — run `bash {{APED_DIR}}/scripts/lint-placeholders.sh {{OUTPUT_DIR}}/brainstorm.md`.
- [ ] **Top survivors non-empty** — at least one converged idea is listed (otherwise the convergence step didn't happen).
- [ ] **Raw ideas preserved** — the archive section lists the raw ideas, not just summaries.
- [ ] **Techniques named** — every technique used in Phase 3 is labelled in the file.

## State Update

Brainstorm is not a formal pipeline phase — it does NOT update `{{OUTPUT_DIR}}/state.yaml`. It's a creative tool usable at any time.

If the brainstorm was a precursor to `aped-analyze`, tell the user:
> "Brainstorm saved at `{{OUTPUT_DIR}}/brainstorm/session-{date}.md`. When you're ready, run `aped-analyze` to turn one of these survivors into a validated product brief."

## Next Step

**Do NOT auto-chain.** The user decides what to do with the survivors — maybe keep brainstorming, maybe go analyze, maybe park for later.

## Example (interactive flow)

User: "aide-moi à brainstormer des idées de features pour bonjour-overlay"

1. **Framing**: Target = "features pour overlay", Lens = "utilisateurs finaux d'un mail server", Constraints = "lean, Bun/Elysia". ⏸ GATE.
2. **Technique selection**: Propose SCAMPER + What If + Customer Support Theater — user picks SCAMPER.
3. **Element 1 (SCAMPER → Substitute)**:
   - You: "What's one thing in the overlay role that, if you swapped it for something completely different, would shift the product's identity?"
   - ⏸ HALT.
   - User: "Maybe replace the auth layer with something passwordless?"
   - You (build): "Love it. What if passwordless went all the way — passkeys + magic links + nothing else? What would users gain?" + AI captures **[Auth #1] Passkey-only auth** + **[Auth #2] Drop password forever**.
4. **Element 2 (SCAMPER → Combine)**: "Combine overlay's two strongest existing features in a way they're not currently combined. Which two come to mind?" ⏸ HALT, coach, capture.
5. After 4-5 exchanges: ⏸ **Energy checkpoint** → user picks `[K]` Keep going.
6. After 10 ideas: **Anti-bias pivot** → "We've stacked on auth. Pivoting to operational angle for the next element."
7. ... continue element by element until ~50+ ideas ...
8. End-of-technique menu → user picks `[T]` Try a different technique → loop into "What If" with the same coaching pattern.
9. **Convergence (Phase 4)**: cluster into auth / observability / dev-experience / integrations. Top 5 survivors with 1-line rationale each.
10. Session saved at `{{OUTPUT_DIR}}/brainstorm/session-2026-04-25.md`.

## Common Issues

- **Model wants to generate 10 ideas at once**: STOP. Critical Rules forbid silent batches. Pose ONE element, HALT, wait for user.
- **User wants to stop at 20 ideas**: Remind them the quota is 50 minimum and pose the energy-checkpoint menu. If they insist, document it and converge — but note in the session file that divergence was cut short.
- **Ideas all feel similar**: Semantic clustering. The auto anti-bias pivot every 10 ideas should catch this; if it didn't fire yet, force it manually next prompt.
- **User rejects every idea**: They may be in evaluation mode. Remind them: during divergence, even bad ideas feed better ones. Capture, move to the next element.
- **Technique feels wrong for the topic**: Use the end-of-technique menu `[T]` to switch. Log the switch in the session file.
- **Resume a paused session**: Read the previous `session-{date}.md`, identify the last technique + element, pick up from the next element. No need to re-run framing.
