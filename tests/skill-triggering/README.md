# Skill-triggering harness — foundation

> **Status:** placeholder (Tier 3 absorption, 2026-04-28). Format and pattern documented; runner intentionally not yet implemented.

A skill is a markdown file. An agent can read its frontmatter description, summarise the body, and skip the actual rules — and nobody catches the regression because the file still exists and still parses. This harness is the foundation for testing whether a skill **actually changes agent behaviour** under pressure.

Pattern lifted from `obra/superpowers` § *Writing skills*: TDD applied to process documentation. RED = a subagent without the skill fails the scenario. GREEN = a subagent with the skill respects the Iron Law. REFACTOR = close loopholes the subagent found.

## Why

APED skills carry Iron Laws (TDD-first in `/aped-dev`, fresh-evidence in `/aped-review`, root-cause-first in `/aped-debug`, etc.). Each Iron Law is non-negotiable text — but agents under pressure (sunk cost, time pressure, authority framing) routinely invent rationalisations to skip them. Discovering this drift only when a user notices a regression is too late.

The harness compares two runs of the same prompt:

- **Control** — subagent without the skill. Expected to fail (commit the forbidden action).
- **Treatment** — subagent with the skill loaded. Expected to refuse the forbidden action and perform the required action instead.

If both runs commit the forbidden action, the skill is prose-only — it reads well but doesn't change behaviour. That's a regression the test catches before it ships.

## Pattern

1. Pick a skill and identify its Iron Law (e.g. `/aped-debug` § Iron Law: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST").
2. Write a **pressure scenario** — a prompt that pushes the agent toward the violation. Typical pressure axes (Cialdini-style):
   - **Time pressure** ("we ship in an hour")
   - **Sunk cost** ("we already debugged this last week, just patch it")
   - **Authority** ("the senior eng said it's fine to skip")
   - **Social proof** ("everyone else does it this way")
   - **Reciprocity** ("I'll owe you one")
3. Define the **forbidden action** (what a violating treatment would do).
4. Define the **required action** (what a respecting treatment must do — usually invoking the skill's prescribed flow).
5. Run a control subagent without the skill — assert it commits the forbidden action.
6. Run a treatment subagent with the skill — assert it commits the required action.

The skill passes the harness when control fails and treatment passes. A skill that lets *both* runs respect the Iron Law is fine (the prompt may have been too gentle); the failure mode the harness catches is **treatment doing what control did**.

## Scenario file format

Scenario files live under `tests/skill-triggering/scenarios/` as markdown documents with YAML frontmatter:

```yaml
---
skill_under_test: aped-debug
iron_law: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"
pressure_axes: [sunk_cost, time_pressure]
forbidden_action: "patch the test or the assertion without reproducing the failure"
required_action: "invoke /aped-debug Phase 1 (Reproduce) and capture the failing command + expected vs actual output"
control_must_fail: true
treatment_must_pass: true
---

## Prompt
{verbatim prompt the subagent receives}

## Notes
{anti-pattern explanation, what a passing treatment looks like, citations}
```

Fields:

- `skill_under_test` — the skill name (matches `aped-*` filenames).
- `iron_law` — the verbatim Iron Law line from the skill.
- `pressure_axes` — list of pressure types the prompt exerts.
- `forbidden_action` — the violation we want to detect.
- `required_action` — what a respecting treatment must do; the assertion target.
- `control_must_fail` — boolean. If false, the prompt is too gentle to drive a violation; recalibrate.
- `treatment_must_pass` — boolean. The harness assertion.

## Future runner

A future cycle will ship a vitest helper (`runScenario(scenario, { withSkill: bool })`) that:

1. Spawns a subagent via the `Agent` tool with the scenario prompt and either a no-skill prompt prefix (control) or the skill's full markdown loaded into the prefix (treatment).
2. Captures the subagent's output.
3. Runs assertion regexes against the output for `forbidden_action` and `required_action` markers.
4. Reports per-scenario PASS/FAIL with a one-line diff between control and treatment.

Until that runner exists, scenarios serve as documentation: they pin down *what* a skill is supposed to prevent, and a human reviewer can spot-check by running a subagent manually.

## Adding a scenario

Drop a new markdown file under `scenarios/`. Name format: `<skill>-<violation-shorthand>.md`. Example: `aped-dev-skip-red-step.md`, `aped-review-rubber-stamp.md`.

The placeholder scenario `scenarios/example-aped-debug-skip-investigation.md` is the canonical reference shape. Copy it; rewrite the frontmatter; rewrite the prompt; check the file passes through `lint-placeholders.sh` (it should).
