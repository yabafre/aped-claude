---
name: aped-debug
description: 'Use when user says "debug", "troubleshoot", "why is X failing", "find the root cause", "aped debug", or invokes aped-debug. Also invoked from aped-dev on persistent test red (≥3 failed attempts) and from aped-review on findings that need root-cause investigation.'
allowed-tools: Read Edit Bash Grep Glob Agent
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Debug — Systematic Debugging

A disciplined investigation flow when something is failing and the cause is not obvious. Lifted from the systematic-debugging pattern in `obra/superpowers`: every fix that suppresses a symptom without identifying the cause is a deferred regression.

## Critical Rules

- Investigate before fixing. The first attempt is **read**, not **patch**.
- Change one thing at a time during root-cause-trace; observe, then decide.
- The fix carries a regression test. Always.
- After **3 successive attempts that did not turn the original repro green** on the same failure, STOP — the architecture/spec/test is the suspect, not your fix #4. (A "different test broke" still counts as not turning the original repro green; that's what the rule fires on.)

### Iron Law

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.** A fix that suppresses the symptom without identifying the cause is a regression with delayed delivery — it ships a working build today and a debugging session next week. Reproducing the failure and tracing it to the responsible code is non-negotiable, even when the fix "looks obvious".

### Red Flags

Phrases that mean you are about to skip the investigation. If you catch yourself thinking any of these, stop and run the phases below.

| Phrase | Why it's wrong |
|--------|----------------|
| "The test is flaky, I'll just retry" | Flaky tests have causes; retry hides the cause without removing it. |
| "This works on my machine" | The CI/other-machine difference *is* the bug. Find it. |
| "Let me just adjust the timeout" | Timeouts hide real performance regressions. Confirm the cause first. |
| "The previous version had this same issue" | Then it was a known bug shipped, not a fix. Investigate now. |
| "It's probably an env thing" | "Probably" is not a diagnosis. Reproduce + trace. |
| "I'll just bump the dependency and see" | Random dependency changes generate compounding bugs. Trace first, then bump deliberately. |

### Rationalizations

| Excuse | Reality |
|--------|---------|
| "The fix is obvious, investigation is wasted time" | The "obvious fix" is the agent's pattern-match, not the cause. Patterns lie. |
| "I already know this part of the code" | You know the code as it was when you last read it; the bug means something has changed. |
| "Tracing 3 levels deep is too slow" | One bad fix costs days of follow-on work. Tracing costs minutes. |
| "Just this once, I'll patch and move on" | "Just this once" is the rationalization Superpowers explicitly fights. It compounds. |

## Phases

Run all four. Each ends with explicit evidence captured **in this message**, not "I'll capture it next time".

### Phase 1 — Reproduce

Goal: a single, deterministic command that produces the failure.

1. Capture the **exact** failing command (copy-paste, not paraphrase).
2. Capture the **expected** output (from the test, the spec, or the user's claim).
3. Capture the **actual** output, run in this session.
4. If the failure is intermittent, run the command 5 times and note the rate. Intermittent ≠ flaky — it's a concurrency/timing/state bug to be traced like any other.

⏸ **GATE: a deterministic repro is captured.** If you can't reproduce, the bug is not understood. Loop back: ask the user for steps, runtime version, environment.

### Sub-discipline: Root-cause tracing

Bugs often manifest deep in the call stack (git init in wrong directory, file created in wrong location, database opened with wrong path). Your instinct is to fix where the error appears, but that's treating a symptom.

**Core principle:** Trace backward through the call chain until you find the original trigger, then fix at the source.

**NEVER fix just where the error appears.** Trace back to find the original trigger.

**Use when:**
- Error happens deep in execution (not at entry point)
- Stack trace shows long call chain
- Unclear where invalid data originated
- Need to find which test/code triggers the problem

#### Backward-tracing decision flow

1. **Observe the symptom** — capture the error verbatim (`Error: git init failed in /Users/...`).
2. **Find immediate cause** — what code directly produces this? (`await execFileAsync('git', ['init'], { cwd: projectDir })`).
3. **Ask: what called this?** — walk one level up the stack (`WorktreeManager.createSessionWorktree → Session.initializeWorkspace → Session.create → test`).
4. **Keep tracing up** — what value was passed at each frame? (`projectDir = ''` empty string!). Empty string as `cwd` resolves to `process.cwd()` — that's the source code directory.
5. **Find original trigger** — where did the empty string come from? (`setupCoreTest()` returns `{ tempDir: '' }` accessed before `beforeEach`).
6. **Fix at the source** — the getter that throws if accessed too early — not the leaf operation.

#### Adding stack traces when manual trace dead-ends

When you can't trace manually, instrument with `console.error()` at each component boundary:

```typescript
// Before the problematic operation
async function gitInit(directory: string) {
  const stack = new Error().stack;
  console.error('DEBUG git init:', {
    directory,
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    stack,
  });

  await execFileAsync('git', ['init'], { cwd: directory });
}
```

**Critical:** Use `console.error()` in tests (not logger — it may not show). Log **before** the dangerous operation, not after it fails. Capture stack with `new Error().stack`.

#### Finding which test causes pollution

If something appears during tests but you don't know which test triggers it, run the bisection script registered under `aped/scripts/find-polluter.sh`. Pass it (1) a path that should NOT exist before any test runs, and (2) a glob of test files to bisect:

```bash
# Example: a stray sqlite db appearing during the suite.
bash {{APED_DIR}}/scripts/find-polluter.sh 'tmp/test-state.db' 'tests/**/*.test.ts'
```

The script runs tests one-by-one, stops at the first one that creates or mutates the state path. Choose a state path that's normally absent at clean start — using `.git` as the example is misleading because `.git` always exists.

#### Pair with Defense-in-depth (Phase 4)

Once root cause is found and fixed, Phase 4's Defense-in-depth sub-discipline locks the fix in at every layer the bad data passes through. Tracing without defense leaves the same bug reachable through a different code path.

### Phase 2 — Root-cause trace

Goal: a confirmed cause statement of the form "the failure happens because <specific code path> does <specific behaviour> when <specific condition>".

Single-change rule: change **one thing at a time**, re-run, observe, decide.

Suggested order:
1. **Bisect the trigger** — narrow the input that causes the failure to its minimum form.
2. **Bisect the code** — turn off / mock / short-circuit suspect modules one by one until the failure disappears, then confirm it reappears when restored.
3. **Bisect the history** — `git bisect` if a regression date is identifiable.
4. **Trace the path** — add temporary logging at the boundary you suspect; remove it after the cause is confirmed.

Stop on confirmed cause. Confirmation = predict-and-test: "if my hypothesis is right, then changing X will produce Y". Run it. If Y happens, hypothesis confirmed. If not, hypothesis wrong — back to bisecting.

⏸ **GATE: cause statement is captured in the form above, with the exact code reference (`file:line`).**

### Sub-discipline: Condition-based waiting

Flaky tests often guess at timing with arbitrary delays. This creates race conditions where tests pass on fast machines but fail under load or in CI.

**Core principle:** Wait for the actual condition you care about, not a guess about how long it takes.

**Use when:**
- Tests have arbitrary delays (`setTimeout`, `sleep`, `time.sleep()`)
- Tests are flaky (pass sometimes, fail under load)
- Tests timeout when run in parallel
- Waiting for async operations to complete

**Don't use when:** the test is *about* timing behaviour itself (debounce, throttle intervals). Always document WHY if using arbitrary timeout.

#### Forbidden patterns

These three failure modes appear every time. Reject them in this order.

| Pattern | Why it fails | Fix |
|---------|--------------|-----|
| **Polling too fast** — `setTimeout(check, 1)` | Wastes CPU; doesn't actually help. | Poll every 10ms. |
| **No timeout** — `while (!cond) { ... }` | Loops forever if condition never met; CI hangs. | Always include a timeout with a clear error. |
| **Stale data** — caching a getter result above the loop | Loop checks the cached value forever, never the live one. | Call the getter **inside** the loop for fresh data. |

#### Core pattern (BEFORE / AFTER)

```typescript
// ❌ BEFORE: Guessing at timing
await new Promise(r => setTimeout(r, 50));
const result = getResult();
expect(result).toBeDefined();

// ✅ AFTER: Waiting for condition
await waitFor(() => getResult() !== undefined);
const result = getResult();
expect(result).toBeDefined();
```

#### Quick patterns

| Scenario | Pattern |
|----------|---------|
| Wait for event | `waitFor(() => events.find(e => e.type === 'DONE'))` |
| Wait for state | `waitFor(() => machine.state === 'ready')` |
| Wait for count | `waitFor(() => items.length >= 5)` |
| Wait for file | `waitFor(() => fs.existsSync(path))` |
| Complex condition | `waitFor(() => obj.ready && obj.value > 10)` |

#### Reference implementation

Generic polling function — copy this into the project's test utilities:

```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    const result = condition();
    if (result) return result;

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }

    await new Promise(r => setTimeout(r, 10)); // Poll every 10ms
  }
}
```

#### When arbitrary timeout IS correct

```typescript
// Tool ticks every 100ms - need 2 ticks to verify partial output
await waitForEvent(manager, 'TOOL_STARTED'); // First: wait for condition
await new Promise(r => setTimeout(r, 200));   // Then: wait for timed behavior
// 200ms = 2 ticks at 100ms intervals - documented and justified
```

**Requirements:** (1) first wait for the triggering condition; (2) use a known timing (not a guess); (3) comment explaining WHY.

### Phase 3 — Fix-with-test

Goal: a regression test that captures the cause + a fix that turns it green, with no other changes.

1. **Write a failing test** that exercises the cause. Run it; it must fail (RED) for the right reason — the same observable failure from Phase 1.
2. **Implement the fix** — the smallest change that addresses the cause statement from Phase 2. Resist the temptation to refactor surrounding code.
3. **Run the test**; it must pass (GREEN).
4. **Run the surrounding test suite**; no other failures.

⏸ **GATE: regression test exists, fix is minimal, all tests pass.**

### Phase 4 — Verify

Goal: confirm the original repro from Phase 1 no longer happens, with evidence in this message.

1. Re-run the original repro command from Phase 1. Capture the output.
2. Compare to the Phase 1 expected output. They must match.
3. If the bug was intermittent, run 5+ times and confirm 0 failures.
4. State the cause + fix + regression test in one short paragraph for the audit trail.

⏸ **GATE: re-run output matches expected, captured here.**

### Sub-discipline: Defense-in-depth

When you fix a bug caused by invalid data, adding validation at one place feels sufficient. But that single check can be bypassed by different code paths, refactoring, or mocks.

**Core principle:** Validate at EVERY layer data passes through. Make the bug **structurally impossible**, not just "fixed at one site".

Single validation: "We fixed the bug." Multiple layers: "We made the bug impossible." Different layers catch different cases — entry validation catches most bugs, business logic catches edge cases, environment guards prevent context-specific dangers, debug logging helps when other layers fail.

#### The four layers

##### Layer 1: Entry-point validation
**Purpose:** Reject obviously invalid input at the API boundary.

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

##### Layer 2: Business-logic validation
**Purpose:** Ensure data makes sense for this operation. Lighter than Layer 1 but still defends against internal callers.

##### Layer 3: Environment guards
**Purpose:** Prevent dangerous operations in specific contexts.

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // ... proceed
}
```

##### Layer 4: Debug instrumentation
**Purpose:** Capture context for forensics when the other three layers somehow miss the case. Stack trace + cwd + env + parameters logged before the dangerous operation, not after it fails.

#### Applying the pattern

When you find a bug:
1. **Trace the data flow** — where does the bad value originate? Where is it used?
2. **Map all checkpoints** — list every point the data passes through.
3. **Add validation at each layer** — entry, business, environment, debug.
4. **Test each layer** — try to bypass Layer 1, verify Layer 2 catches it.

**Don't stop at one validation point.** All four layers were necessary in the original superpowers debugging session: different code paths bypassed entry validation; mocks bypassed business-logic checks; edge cases on different platforms needed environment guards; debug logging identified structural misuse.

⏸ **GATE: each of the four layers is added or explicitly N/A with a one-line justification before declaring resolved.**

## 3-failed-fixes rule

If you reach Phase 3 (Fix-with-test) and three successive attempts have not turned the original repro green — the test is still red, a different test broke, or the fix didn't survive a re-run — **STOP**.

The unifying definition (consistent with `aped-dev` HALT Conditions and `aped-review` Step 6 routing): the rule fires when **three attempts in a row failed to make the original failing repro pass**. A different test breaking is not a sign of progress; it is a sign that the cause is broader than assumed.

Three failed attempts on the same failure means **your model of the cause is wrong**. Not "I need a smarter fix #4". The architecture, the spec, the test itself, or the assumption you're operating under is the suspect. Question those, not the fix.

When this rule fires:

1. Write down the three attempts and what each produced (one line each).
2. State the assumption each attempt shared.
3. Surface to the user: "I have tried three fixes on this failure and none has moved it forward. They share the assumption that <X>. Is that assumption right? Should we look at <architectural alternative> instead?"
4. ⏸ **HALT** until the user agrees on a new direction.

This rule is **not** a counsel of perfection — it is the empirical observation, lifted verbatim from Superpowers' `systematic-debugging`, that beyond 3 attempts the marginal cost of the 4th attempt vastly exceeds the cost of stepping back.

## Self-review (run before declaring resolved)

Before announcing the bug is fixed, walk this checklist. Each `[ ]` must flip to `[x]` or HALT.

- [ ] **Phase 1 repro re-run** — original failing command was re-run in this session and now passes; the output is captured here.
- [ ] **Regression test exists** — a test that would have caught this bug now lives in the suite, not as a comment, not as a TODO.
- [ ] **Root cause documented** — the cause statement (`file:line`, condition, behaviour) is recorded — in the commit message at minimum, in `docs/aped/lessons.md` if it represents a class of bug worth remembering.
- [ ] **No unrelated changes** — the diff contains only the fix and its regression test. No drive-by refactors, no formatting churn.
- [ ] **Lint clean** — if the debug session produced a notes file (e.g. `docs/aped/debug/<bug>-{date}.md`), run `bash {{APED_DIR}}/scripts/lint-placeholders.sh <notes-file>`.

## Invocation contexts

This skill is called in three situations.

### Standalone (user-driven)

User invokes `aped-debug` directly. Start at Phase 1 with the user's failure description.

### From `aped-dev` (persistent test red)

`aped-dev` enforces a 3-failed-fixes trigger via the same rule documented here. When a TDD task has had three red attempts that didn't move the failure forward, `aped-dev` HALTs and recommends `aped-debug`. Phase 1 inherits the failing test as the repro; the 3-failed-fixes rule fires immediately and HALTs to question the architecture/spec.

### From `aped-review` (root-cause finding)

`aped-review` Step 6 (Merge Findings) routes findings whose mechanism is unclear (Eva flags a bug, Marcus surfaces a regression) to `aped-debug` rather than letting the specialist guess. Phase 1 takes the finding's repro; the verdict feeds back as evidence appended to the review report.

## Output

- Cause + fix recorded in the commit message.
- (Optional) `docs/aped/debug/<short-slug>-{date}.md` — debug notes for sessions worth remembering. Lint applies.
- Regression test in the suite.

## Common Issues

- **Cannot reproduce locally** — the bug is environmental. Step 1 is to identify the environmental delta (versions, env vars, OS, working directory state). Don't fix anything until you can reproduce.
- **Bisect is impractical** (the failure depends on accumulated state) — short-circuit modules instead. Same single-change-at-a-time rule.
- **The cause is in a dependency** — pin the dependency, file an upstream issue, write the regression test against the pinned version. Don't update blindly hoping it's fixed in a later release.

## Next Step

After Phase 4 verifies, return control to the calling skill (`aped-dev` resumes the next TDD task; `aped-review` resumes Step 7) or to the user (standalone invocation).
