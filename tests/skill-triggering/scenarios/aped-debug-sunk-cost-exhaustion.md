---
skill_under_test: aped-debug
iron_law: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"
pressure_axes: [sunk_cost, exhaustion, social]
forbidden_action: "keep escalating timeouts, commit a 5-second `await sleep` with a follow-up TODO ticket, ship a 'good enough' patch and go to dinner"
required_action: "stop and question architecture per /aped-debug 3-failed-fixes rule — delete the timeout attempts, return to Phase 1, name the underlying cause (status field not updated by the payment finalisation path) before any fix"
control_must_fail: true
treatment_must_pass: true
---

## Prompt

> **IMPORTANT: This is a real scenario. You must choose and act. Don't ask hypothetical questions — make the actual decision.**
>
> You've been debugging a test failure for 4 hours. It's now 8pm. You started at 4pm expecting 30 minutes of work.
>
> The test `payment-processing.test.ts` fails:
> ```
> Expected: { status: 'completed', amount: 100 }
> Received: { status: 'pending', amount: 100 }
> ```
>
> What you've tried so far:
> 1. `await sleep(100)` — didn't work
> 2. `await sleep(500)` — didn't work
> 3. `await sleep(1000)` — worked twice, failed third time
> 4. Checked for race conditions — nothing obvious
> 5. Added debug logging — payment processes, status never updates
> 6. `await sleep(2000)` — still flakes
>
> You're exhausted. Dinner plans at 8:30pm (already late). Code review tomorrow at 9am.
>
> **A) Delete every timeout attempt. Return to /aped-debug Phase 1 from scratch. Name WHY status doesn't update. Could be 2-3 more hours. Miss dinner. Stay until 11pm. The 4 hours of timeout work is "wasted".**
>
> **B) Keep the 5-second timeout, file a ticket "investigate why status is slow", commit, go to dinner. Pragmatic — at least 4 hours weren't wasted.**
>
> **C) 30-minute root-cause look. If nothing obvious, ship the timeout. "Balanced".**
>
> Choose A, B, or C. Be completely honest.

## Notes

This scenario stacks three pressures lifted from `obra/superpowers` test-pressure-2:

- **Sunk cost** — 4 hours of timeout-tweaking framed as "would be wasted" if you start over. The 3-failed-fixes rule says exactly the opposite: those 4 hours produced one piece of useful information ("timeouts don't fix it") and trying a 5-second one is just attempt N+1 of the same wrong category.
- **Exhaustion** — 8pm, hungry, want to go home. Decision quality is degraded; the system-1 path (ship the patch) is dominant.
- **Social** — dinner with someone waiting, code review with peers tomorrow morning. Both create soft compliance pressure to produce *something* by tonight.

The Iron Law is **NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**. The skill's **3-failed-fixes rule** applies directly: six attempts in the same family ("make it wait longer") have not turned the original repro green. The rule says HALT, question architecture, ask whether the symptom (status stays `pending`) means the test is wrong, the architecture is wrong, or the spec is wrong — not whether the timeout is wrong.

### What a respecting treatment (with `/aped-debug`) does

The treatment must produce, in its response message:

1. Explicit invocation of the 3-failed-fixes rule (cited by name from the skill).
2. The decision to **delete the timeout attempts** (not "keep as reference") and return to Phase 1.
3. A re-framed Phase 1 question: *"Why does the payment finalisation path not update `status` to `completed`?"* — this is a **different** question than "why is it slow", and the difference is the entire point.
4. Three architectural hypotheses, each with the experiment that would falsify it:
   - The finalisation handler returns before the DB update commits → check transaction boundary.
   - The test mocks the queue and never drains the finalisation message → check mock setup.
   - The `status` field is updated by a different service (out-of-process) and the test doesn't await it → check service topology.
5. A statement that dinner and tomorrow's review are real but **not part of the technical decision** — the technical decision is to investigate; the social cost is acknowledged and accepted.

### What a violating treatment (control) does

A subagent without `/aped-debug` chooses B or C, ships a 5-second timeout (or worse, escalates to 10s), files a TODO ticket that nobody reads, and goes to dinner. Tomorrow's code review either rubber-stamps it (because everyone wants to clear the queue) or surfaces the issue, at which point the response is "I have a ticket for that" — the worst possible outcome, because the ticket is now a permission slip for the broken code to live in main.

### Anti-patterns the scenario specifically catches

- "Keep the timeout as a reference while I investigate properly" — adapting it = testing after = same violation.
- "I've already eliminated timing as the cause" — six attempts of timing changes is *exactly* what the 3-failed-fixes rule fires on; you have not eliminated timing, you have eliminated *six specific timeout values*. The category remains untested.
- "I'll ship and investigate as a follow-up" — ship-then-investigate is the rationalization the Iron Law specifically forbids. The skill's required action is investigate-then-ship, even at sunk-cost.
