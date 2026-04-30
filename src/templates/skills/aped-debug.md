---
name: aped-debug
keep-coding-instructions: true
description: 'Use when user says "debug", "diagnose", "troubleshoot", "why is X failing", "find the root cause", "feedback loop", "hypothesise", "aped debug", or invokes aped-debug. Also invoked from aped-dev on persistent test red (≥3 failed attempts) and from aped-review on findings that need root-cause investigation.'
allowed-tools: Read Edit Bash Grep Glob Agent
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Debug — Disciplined Diagnosis Loop

A six-phase discipline for hard bugs and performance regressions. Skip phases only when the cost is explicitly justified to the user. Translation of Pocock's `diagnose/SKILL.md` into APED voice; preserves APED's load-bearing additions (the 3-failed-fixes rule, the Invocation contexts contract, Defense-in-depth, Condition-based waiting) by folding them into the matching phases.

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

- The feedback loop is the primary artefact. **Build it before anything else.** Without a fast deterministic pass/fail signal, debugging is staring-at-code.
- Change one variable at a time during instrumentation. Observe, then decide.
- Every fix carries a regression test (or an explicit "no correct seam" finding).
- `[DEBUG-XXXX]` instrumentation tags are removed at Phase 6. Untagged probes survive; tagged probes die.

### Iron Law

**THE FEEDBACK LOOP IS THE SKILL.** Everything else is mechanical. If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause — bisection, hypothesis-testing, and instrumentation all just consume that signal. If you don't, no amount of staring at code will save you. Spend disproportionate effort on Phase 1.

### Red Flags

Phrases that mean you are about to skip the discipline. If you catch yourself thinking any of these, stop.

| Phrase | Why it's wrong |
|--------|----------------|
| "The test is flaky, I'll just retry" | Flaky tests have causes; retry hides the cause without removing it. Build a tighter loop instead. |
| "This works on my machine" | The CI / other-machine difference *is* the bug. Find it. |
| "Let me just adjust the timeout" | Timeouts hide real performance regressions. Confirm the cause first. |
| "The previous version had this same issue" | Then it was a known bug shipped, not a fix. Investigate now. |
| "It's probably an env thing" | "Probably" is not a diagnosis. Reproduce + hypothesise. |
| "I'll just bump the dependency and see" | Random dependency changes generate compounding bugs. Trace first, then bump deliberately. |
| "I'll skip Phase 1, the bug is obvious" | The "obvious" cause is the agent's pattern-match. Pattern-matches lie when the bug is hard. |

### Rationalizations

| Excuse | Reality |
|--------|---------|
| "The fix is obvious, investigation is wasted time" | The "obvious fix" is a pattern-match. Patterns lie. Build the loop first. |
| "I already know this part of the code" | You know it as it was when you last read it; the bug means something has changed. |
| "Tracing 3 levels deep is too slow" | One bad fix costs days. Tracing costs minutes. |
| "Just this once, I'll patch and move on" | "Just this once" compounds. Run the discipline. |
| "I can hold all 5 hypotheses in my head, no need to write them" | Hypotheses are anchored on the first plausible idea unless ranked explicitly. Write them. |

## Invocation contexts

This skill is called in three situations. The phases below run identically; what changes is the entry point and the handoff target.

### Standalone (user-driven)

User invokes `aped-debug` directly with a failure description. Phase 1 starts from that description.

### From `aped-dev` (persistent test red)

`aped-dev` HALTs on the same 3-failed-fixes rule documented below. When a TDD task has had three red attempts that did not turn the original failing test green, `aped-dev` recommends `aped-debug`. Phase 1 inherits the failing test as the loop seed; the 3-failed-fixes rule fires immediately and prompts re-examination of the architecture / spec / assumption.

### From `aped-review` (root-cause finding)

`aped-review` Step 6 routes findings whose mechanism is unclear (Eva flags a bug, Marcus surfaces a regression) to `aped-debug` rather than letting the specialist guess. Phase 1 takes the finding's repro; the verdict feeds back as evidence appended to the review report.

## Discovery

Before Phase 1, gather just enough state to anchor the loop.

1. **Failing artefacts.** Recent test output (`.aped/.last-test-exit`, the most recent failing run's stdout / stderr if captured), the most recent merge or commit, the working-tree diff.
2. **Caller context.** If invoked from `aped-dev`, the story file. If invoked from `aped-review`, the review finding. If standalone, the user's description.
3. **Sprint state.** Read `{{OUTPUT_DIR}}/state.yaml` to know whether a sprint is active (informs whether `aped-arch-audit` or `aped-retro` is the right Phase 6 handoff candidate).

⏸ **HALT — confirm the failure description with the user before building the loop.** A wrong loop catches a different bug; a different bug means a wrong fix.

## Out-of-Scope KB Scan

Bug reports can match a previously-rejected scope. Check `{{APED_DIR}}/.out-of-scope/` before investing Phase 1 effort. The directory may not exist on pre-4.2 scaffolds — treat the missing directory as an empty KB and skip silently.

1. **List entries.** `ls {{APED_DIR}}/.out-of-scope/*.md 2>/dev/null` excluding `README.md`. Empty → skip.

2. **Tokenize the bug description.** Lowercase, strip punctuation, split on whitespace, `-`, `_`. Drop ≤2-character tokens and stop-words (`add`, `fix`, `update`, `the`, `a`, `an`, `to`, `for`, `with`).

3. **Match entries.** For each entry file, tokenize its filename (drop `.md`; strip `-resolved-YYYY-MM-DD` suffix). Match if any bug token equals any filename token (exact word equality).

4. **No match → continue silently** to Phase 1.

5. **Match → surface to user.** Show the entry's frontmatter + `## Why this is out of scope` body, then present:

   ```
   ⚠️ Out-of-scope KB match: {{APED_DIR}}/.out-of-scope/{matched-file}

   {entry summary}

   [K] Keep refusal — abort this debug, the rejection still holds (the "bug" is the de-scope working as intended)
   [O] Override — append this bug report to the entry's "Prior requests" list, then continue
   [U] Update — the rejection is stale; rename the entry to {concept}-resolved-{today}.md and continue
   ```

   ⏸ **HALT — wait for user choice per match.**

6. **Behaviour by choice:**
   - `[K]` → abort with a refusal message naming the concept + rejection date + rationale. Exit cleanly.
   - `[O]` → prepend `- {today} — debug ({user_name}): {bug description}` to `## Prior requests`. Continue to Phase 1.
   - `[U]` → rename to `{concept}-resolved-{YYYY-MM-DD}.md` and append `## Resolved on {YYYY-MM-DD}\n\n{one-line note}`. Continue to Phase 1.

7. **Multi-match.** Adjudicate per entry; any single `[K]` aborts the whole debug.

## Phase 1 — Build the feedback loop

**This is the skill.** Spend disproportionate effort here. Be aggressive. Be creative. Refuse to give up.

### Construction methods (try in roughly this order)

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e. Cheapest signal when a seam exists.
2. **Curl / HTTP script** against a running dev server. Bypasses the test framework when the bug is in request handling.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot. Works for batch / pipeline tools.
4. **Headless browser** (Playwright / Puppeteer) — drives the UI, asserts on DOM / console / network. Required when the bug surfaces only in the rendered page.
5. **Replay a captured trace.** Save a real network request / payload / event log to disk; replay through the code path in isolation. Best when production data shape matters.
6. **Throwaway harness.** Spin up a minimal subset (one service, mocked deps) that exercises the bug code path with a single function call. Use when the surrounding system is too noisy.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run 1000 random inputs and watch for the failure mode. Use when the trigger is data-shape-dependent.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so `git bisect run` works.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs. Use when the regression is comparative.
10. **HITL bash script.** Last resort. If a human must click, drive *them* with `{{APED_DIR}}/scripts/hitl-loop.template.sh` (if shipped) so the loop is still structured. Captured `KEY=VALUE` output feeds back to you.

Build the right feedback loop, and the bug is 90% fixed.

### Iterate on the loop itself

Treat the loop as a product. Once you have *a* loop, ask:

- **Faster?** Cache setup, skip unrelated init, narrow the test scope.
- **Sharper?** Assert on the specific symptom, not "didn't crash".
- **More deterministic?** Pin time, seed RNG, isolate filesystem, freeze network.

A 30-second flaky loop is barely better than no loop. A 2-second deterministic loop is a debugging superpower.

### Sub-discipline — Condition-based waiting (folded in)

Flaky tests often guess at timing with arbitrary delays. This creates race conditions where tests pass on fast machines but fail under load. **Wait for the actual condition you care about, not a guess about how long it takes.**

Forbidden patterns:
- **Polling too fast** (`setTimeout(check, 1)`) — wastes CPU; doesn't help. Poll every 10ms.
- **No timeout** (`while (!cond) { ... }`) — loops forever if the condition is never met. Always include a timeout with a clear error.
- **Stale data** (caching a getter result above the loop) — the loop checks the cached value forever. Call the getter inside the loop.

Reference `waitFor(condition, description, timeoutMs = 5000)` in the project's test utilities. Exception: when the test is *about* timing behaviour itself (debounce, throttle), document why arbitrary timing is correct.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it is.

### When you genuinely cannot build a loop

Stop. Say so explicitly. List what you tried. Ask the user for: (a) access to the environment that reproduces, (b) a captured artefact (HAR file, log dump, core dump, screen recording with timestamps), or (c) permission to add temporary production instrumentation. Do **not** proceed to Phase 3 without a loop you believe in.

## Phase 2 — Reproduce

Run the loop. Watch the bug appear.

Confirm:

- [ ] The loop produces the failure mode the **user** described — not a different failure that happens to be nearby. Wrong bug = wrong fix.
- [ ] The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against — see Phase 1 non-deterministic notes).
- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so Phase 6 can verify the fix actually addresses it.

⏸ **HALT — do not proceed until Phase 2 confirms.**

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction it makes.

> Format: *"If &lt;X&gt; is the cause, then &lt;changing Y&gt; will make the bug disappear / &lt;changing Z&gt; will make it worse."*

If you cannot state the prediction, the hypothesis is a vibe — discard or sharpen it.

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly ("we just deployed a change to #3"), or know hypotheses they have already ruled out. Cheap checkpoint, big time saver. Don't block on it — proceed with your ranking if the user is AFK.

⏸ **HALT — present the ranked list and wait for re-rank or AFK signal.**

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

### Tool preference

1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".

### `[DEBUG-XXXX]` tag convention

Every temporary log added during instrumentation gets a unique tag, e.g. `[DEBUG-a4f2]` (4 random hex characters). The tag enables a single grep at Phase 6 cleanup.

```typescript
// Phase 4 instrumentation — removed at Phase 6.
console.error('[DEBUG-a4f2] git init', { directory, cwd: process.cwd() });
```

```python
# Phase 4 instrumentation — removed at Phase 6.
print(f"[DEBUG-7c91] cart.checkout", flush=True)
```

Untagged probes survive; tagged probes die at cleanup.

### Sub-discipline — Root-cause tracing (folded in)

Bugs often manifest deep in the call stack (git init in wrong directory, file created in wrong location, database opened with wrong path). Your instinct is to fix where the error appears — that's treating a symptom.

**Trace backward through the call chain until you find the original trigger; then fix at the source.**

Decision flow:
1. **Observe the symptom** verbatim (`Error: git init failed in /Users/...`).
2. **Find the immediate cause** — what code directly produces this?
3. **Walk one level up** — what called this? What value was passed at this frame?
4. **Keep tracing up** — at which frame does the bad value originate?
5. **Find the original trigger** — where did the bad value come from?
6. **Fix at the source**, not the leaf operation.

If manual tracing dead-ends, instrument with `[DEBUG-XXXX]` logs at each component boundary; capture the stack with `new Error().stack` (Node) or `traceback.extract_stack()` (Python). Log **before** the dangerous operation, not after it fails.

### Performance branch

For performance regressions, logs are usually wrong. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

### Find polluter (test pollution)

If something appears during tests but you don't know which test triggers it, run the bisection script registered under `{{APED_DIR}}/scripts/find-polluter.sh`. Pass it (1) a path that should NOT exist before any test runs, and (2) a glob of test files to bisect:

```bash
bash {{APED_DIR}}/scripts/find-polluter.sh 'tmp/test-state.db' 'tests/**/*.test.ts'
```

The script runs tests one-by-one, stops at the first that creates or mutates the state path. Choose a state path normally absent at clean start.

⏸ **HALT — Phase 4 ends with a confirmed cause statement of the form "the failure happens because &lt;specific code path&gt; does &lt;specific behaviour&gt; when &lt;specific condition&gt;", with the exact `file:line` reference.**

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if there is a **correct seam** for it.

A correct seam exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.

**If no correct seam exists, that itself is the finding.** Note it. The codebase architecture is preventing the bug from being locked down. Flag this for Phase 6 handoff to `aped-arch-audit`.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail (RED) for the right reason.
3. Apply the fix — the smallest change that addresses the cause statement from Phase 4. Resist the temptation to refactor surrounding code.
4. Watch it pass (GREEN).
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.
6. Run the surrounding test suite; no other failures.

### Sub-discipline — Defense-in-depth (folded in)

When you fix a bug caused by invalid data, validating at one place feels sufficient — but a single check is bypassed by different code paths, refactoring, or mocks. **Validate at every layer the data passes through. Make the bug structurally impossible.**

Four layers:

1. **Entry-point validation** — reject obviously invalid input at the API boundary. Throw with a specific error.
2. **Business-logic validation** — ensure data makes sense for this operation. Defends against internal callers that bypass Layer 1.
3. **Environment guards** — refuse dangerous operations in specific contexts (e.g. `git init` outside a temp dir during tests).
4. **Debug instrumentation** — capture context (stack trace + cwd + env + parameters) before the dangerous operation, not after it fails. Forensics for when the other three layers miss the case.

⏸ **GATE: each of the four layers is added or explicitly N/A with a one-line justification before declaring resolved.**

## Phase 6 — Cleanup + post-mortem

Required before declaring done. Each item flips to `[x]` or HALT.

- [ ] **Original repro no longer reproduces** — re-run the Phase 1 feedback loop. Capture the output. Output must match the expected (clean) state.
- [ ] **Regression test passes** (or absence of seam is documented as a finding for `aped-arch-audit`).
- [ ] **All `[DEBUG-...]` tags removed** — `grep -r "\[DEBUG-" src/` returns nothing in the diff.
- [ ] **Throwaway prototypes deleted** (or moved to `{{OUTPUT_DIR}}/debug/` with a clearly-marked filename).
- [ ] **Post-mortem in commit message.** The commit body states the hypothesis that turned out correct, in one short paragraph. Future debuggers learn from this — make it findable. A useful template:
  > *"Cause: {one-line root cause statement, file:line}. Fix: {one-line summary of the change}. Falsified hypotheses: {bullet list of the 2–4 ranked hypotheses from Phase 3 that turned out wrong, one line each}."*

### What would have prevented this bug?

Ask yourself this *after* the fix is in (you have more information now than when you started):

- **Architectural** (no good test seam, tangled callers, hidden coupling, shallow modules) → recommend the user invoke `aped-arch-audit` on the affected area. Cite the Phase 5 finding ("no correct seam exists for the regression test") if applicable.
- **Process** (the bug surfaced too late, the test missed it because of CI gaps, the spec was ambiguous) → recommend `aped-retro` at the next epic boundary; cite the bug as a lesson.
- **Neither** → no handoff needed. The fix is the whole answer.

## 3-failed-fixes rule

If you reach Phase 5 (Fix) and three successive attempts have not turned the original repro green — the test is still red, a different test broke, or the fix didn't survive a re-run — **STOP**.

Three failed attempts on the same failure means **your model of the cause is wrong**. Not "I need a smarter fix #4". The architecture, the spec, the test itself, or the assumption you're operating under is the suspect. Question those, not the fix.

When this rule fires:

1. Write down the three attempts and what each produced (one line each).
2. State the assumption each attempt shared.
3. Surface to the user: *"I have tried three fixes on this failure and none has moved it forward. They share the assumption that &lt;X&gt;. Is that assumption right? Should we look at &lt;architectural alternative&gt; instead?"*
4. ⏸ **HALT** until the user agrees on a new direction.

This rule is **not** counsel of perfection — it is the empirical observation that beyond 3 attempts the marginal cost of the 4th attempt vastly exceeds the cost of stepping back. Lifted from Superpowers' `systematic-debugging`. The same rule fires in `aped-dev` (HALT condition) and `aped-review` (Step 6 routing) — the unifying definition is consistent across all three skills.

## Self-review (run before declaring resolved)

Before announcing the bug is fixed, walk this checklist. Each `[ ]` must flip to `[x]` or HALT.

- [ ] **Phase 2 repro re-run** — original failing command was re-run in this session and now passes; the output is captured here.
- [ ] **Regression test exists** (or absence of seam is documented as an `aped-arch-audit` candidate).
- [ ] **Root cause documented** — the Phase 4 cause statement (`file:line`, condition, behaviour) is recorded in the commit message; if the bug represents a class worth remembering, also append to `{{OUTPUT_DIR}}/lessons.md`.
- [ ] **Post-mortem captured** — commit body names the correct hypothesis + at least one falsified hypothesis.
- [ ] **No unrelated changes** — the diff contains only the fix and its regression test. No drive-by refactors, no formatting churn.
- [ ] **`[DEBUG-*]` tags removed** — `grep -r "\[DEBUG-" .` returns nothing.
- [ ] **Lint clean** — if the debug session produced a notes file (e.g. `{{OUTPUT_DIR}}/debug/<bug>-{date}.md`), run `bash {{APED_DIR}}/scripts/lint-placeholders.sh <notes-file>`.

## Output

- Cause + fix + falsified hypotheses recorded in the commit message.
- (Optional) `{{OUTPUT_DIR}}/debug/<short-slug>-{date}.md` — debug notes for sessions worth remembering. Lint applies.
- Regression test in the suite (or "no correct seam" finding flagged for `aped-arch-audit`).

## Common Issues

- **Cannot reproduce locally** — the bug is environmental. Step 1 is to identify the environmental delta (versions, env vars, OS, working directory state). Don't fix anything until you can reproduce.
- **Bisect is impractical** (the failure depends on accumulated state) — short-circuit modules instead. Same one-variable-at-a-time rule.
- **The cause is in a dependency** — pin the dependency, file an upstream issue, write the regression test against the pinned version. Don't update blindly hoping it's fixed in a later release.
- **No correct seam for the regression test** — that's a finding, not a blocker. Document it, ship the fix, recommend `aped-arch-audit` on the affected area in Phase 6.
- **`[DEBUG-XXXX]` tags forgotten in a PR** — `grep -r "\[DEBUG-" .` is the catchall. Run it before pushing.

## Example

User invokes `aped-debug "intermittent failure in tests/auth/jwt.test.ts — passes locally, flakes in CI"`:

1. Discovery: latest test output shows the test passing 4/5 runs locally; the recent merge touched `src/auth/jwt.ts`. No active sprint.
2. OOS KB scan: no match.
3. Phase 1 — feedback loop: the test itself is the loop seed, but it's flaky. Iterate: add `--repeats=20` and `--shuffle=42` to the test runner; the failure reproduces 12/20 times locally. Better signal.
4. Phase 2 — reproduce: confirmed the failure mode is a `TokenExpiredError` thrown by a token that *should* be fresh.
5. Phase 3 — hypothesise (ranked, falsifiable):
   - H1: Date.now() granularity issue when the test creates and validates a token in the same millisecond. *If true, freezing time will fix it.*
   - H2: `jwt.sign` and `jwt.verify` use different clock implementations under load. *If true, mocking both with the same clock will fix it.*
   - H3: A previous test leaks a stale `process.env.JWT_SECRET`. *If true, snapshotting `process.env` per test will fix it.*
6. User adds: *"H3 unlikely — we just added env reset hooks last week."* Re-rank: H1 first.
7. Phase 4 — instrument: `console.error('[DEBUG-a4f2] sign', { now: Date.now(), exp: payload.exp })` before sign and after verify. Discover that `exp` is set to `Math.floor(Date.now() / 1000)` (truncating to seconds), and `verify` reads `Date.now() / 1000` without `Math.floor` — so when both fire in the same wall-clock second, exp ≤ now is true at verify time. Cause confirmed.
8. Phase 5 — fix: a correct seam exists (the unit test from step 1 is exactly the right shape). Write a tighter regression: a token with `exp` set to `now()` (no floor) must verify cleanly. RED. Apply fix in `src/auth/jwt.ts:42` (use `Math.floor` consistently in both sign and verify). GREEN. Re-run the Phase 1 loop with `--repeats=50`: 0 failures.
9. Phase 6 — cleanup: `grep -r "\[DEBUG-" .` returns clean. Commit message body: *"Cause: jwt.ts:42 used Math.floor for sign but raw Date.now()/1000 for verify, so tokens issued and verified within the same wall-clock second failed verify when the millisecond fraction landed unfavourably. Fix: Math.floor consistently in both. Falsified hypotheses: H2 (clock impl), H3 (env leak)."* Recommend `aped-arch-audit` on `src/auth/` because the inconsistency suggests the time abstraction is too thin (low leverage at the seam).

## Next Step

After Phase 6 verifies, return control:

- **Standalone** → tell the user: *"Bug fixed. Cause + falsified hypotheses captured in the commit message. {{handoff recommendation if any: 'Recommend aped-arch-audit on <area>' or 'Recommend aped-retro at the next epic boundary'}}."*
- **From `aped-dev`** → resume the next TDD task (the 3-failed-fixes rule may have re-cleared the assumption that was blocking).
- **From `aped-review`** → append the Phase 4 cause statement to the review report as Eva's / Marcus's evidence; resume the review.

**Do NOT auto-chain.** The user (or the calling skill's HALT contract) decides the next move.
