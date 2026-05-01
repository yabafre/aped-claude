// Completion-gate checklists (5.5.0). Each skill > 250 lines gets a
// companion checklist file at <apedDir>/skills/aped-skills/checklist-<name>.md.
// The skill body's final section references this file with an explicit Read
// instruction, forcing re-injection of completion criteria into context at
// the point where attention is lowest (Anthropic context-engineering guidance).
//
// Pattern from BMAD: separate checklist files force the agent to load fresh
// context rather than relying on recall from the skill body it loaded
// thousands of tokens ago.

export function checklists({ apedDir }) {
  const dir = `${apedDir}/skills/aped-skills`;
  return [
    {
      path: `${dir}/checklist-dev.md`,
      content: `# aped-dev — Completion Gate

Read this checklist BEFORE declaring dev complete. Every unchecked item is a blocker.

- [ ] **Branch verified** as a feature branch (not main/master/prod/develop) — branch creation is aped-story's job, this skill only verifies
- [ ] **RED witnessed** for every new test (Confirmed RED token emitted)
- [ ] **GREEN confirmed** (test runner exit 0, output visible in transcript)
- [ ] **Verbatim AC quote** present above each test (no paraphrase)
- [ ] **Schema identifiers** verified verbatim against story / PRD (no invented table/column names)
- [ ] **One commit per task** (not batched at the end)
- [ ] **No git add .** anywhere — specific files only
- [ ] **No --no-verify** on any commit (pre-commit hooks must run)
- [ ] **last-test-exit cache** updated (.aped/.last-test-exit = 0)
- [ ] **Story file Dev Agent Record** filled (NO Review Record — that's aped-review's territory)
- [ ] **Story file status** updated to review (not still ready-for-dev)
- [ ] **state.yaml updated** (pipeline.phases.dev.status = complete)
- [ ] **Ticket synced** (if ticket_system != none: status → In Review, comment with summary)
- [ ] **PR created** with link to story (only in classic solo mode without sprint umbrella)
- [ ] **dev-done check-in posted** (worktree/parallel-sprint mode only)
`,
    },
    {
      path: `${dir}/checklist-story.md`,
      content: `# aped-story — Completion Gate

- [ ] **Branch refusal-on-main respected** — never created a story on main/master/prod/production/develop/release/*/DETACHED
- [ ] **Feature branch created** before writing the story file (solo mode) OR pre-existing in worktree mode
- [ ] **Branch name follows convention** feature/{ticket}-{slug} (or feature/none-{slug} when ticket_system=none)
- [ ] **Step-0 quote** present in Dev Notes for every modified file (or "none — new file" for greenfield)
- [ ] **File structure design** present — 3-bullet decision template per file in File List
- [ ] **Reader-persona check** ran — story top-to-bottom asks "would the junior produce the right code from this?"
- [ ] **Task granularity contract** — every task has all 5 must-haves (path, full code, test cmd, expected output, commit step)
- [ ] **Forbidden patterns absent** — no "similar to story X", "appropriate error handling", "see line N", snippet "..."
- [ ] **Story file written** to {{OUTPUT_DIR}}/stories/
- [ ] **Placeholder lint** passed (no TODO/TBD/<replace-me> in the story file)
- [ ] **state.yaml updated** (sprint.stories.{key}.status = ready-for-dev)
- [ ] **Ticket synced** (if ticket_system != none: assign + post refined-AC comment, never overwrite body)
- [ ] **All ACs** have measurable acceptance criteria (no "should work well")
- [ ] **ACs describe behaviour** not implementation (no file paths or function names in ACs — those go in Tasks)
- [ ] **Worktree mode**: story file + state.yaml committed on the feature branch, story-ready check-in posted
`,
    },
    {
      path: `${dir}/checklist-review.md`,
      content: `# aped-review — Completion Gate

- [ ] **Fresh context** (not same session as implementation — if same, /clear first)
- [ ] **Stage 1 (Eva)** completed — AC validation verdict rendered as a synchronous gate
- [ ] **NACK handled** — Eva NACK led to [F]ix or [O]verride with non-empty reason (override path only)
- [ ] **Stage 1.5** dispatched in parallel (if review.parallel_reviewers = true in config) — Hannah/Eli/Aaron
- [ ] **Stage 2** dispatched in a single Agent message — Marcus/Rex + conditionals
- [ ] **Marcus 5-anti-pattern audit** included in his prompt and findings reflect it
- [ ] **Rex git-audit** ran via the script (not paraphrased)
- [ ] **Minimum 3 findings** — re-dispatch a specialist if fewer
- [ ] **Every finding has evidence** — file:line + Evidence + Suggested fix + Source
- [ ] **Verification re-run captured in this message** (test runner output / diff+output / screenshot)
- [ ] **No forbidden phrases alone** — "should work" / "looks good" / "probably fine" never present without evidence
- [ ] **Verdict** clearly stated (story → done OR stays review)
- [ ] **Ticket comment posted** with the consolidated report (if ticket_system != none)
- [ ] **PR opened/updated against sprint.umbrella_branch** (NEVER against base) — only when story → done
- [ ] **Review Record appended to the story file** at {{OUTPUT_DIR}}/stories/{story-key}.md
- [ ] **NO separate review file created** anywhere — the story file is the single canonical home
- [ ] **state.yaml updated** to match the verdict (story → done OR stays review)
- [ ] **review-done check-in posted** (worktree/parallel-sprint mode + story → done)
`,
    },
    {
      path: `${dir}/checklist-prd.md`,
      content: `# aped-prd — Completion Gate

- [ ] **PRD file written** to {{OUTPUT_DIR}}/prd.md
- [ ] **validate-prd.sh** passed (exit 0)
- [ ] **oracle-prd.sh** passed (0 ERROR lines)
- [ ] **FR count** ≥ 10 (per validate-prd.sh)
- [ ] **No anti-pattern words** (easy, intuitive, fast, simple, etc.)
- [ ] **state.yaml updated** (pipeline.phases.prd.status = complete)
- [ ] **NFRs** have measurable thresholds (not "should be performant")
`,
    },
    {
      path: `${dir}/checklist-arch.md`,
      content: `# aped-arch — Completion Gate

- [ ] **Architecture file written** to {{OUTPUT_DIR}}/architecture.md
- [ ] **oracle-arch.sh** passed (0 ERROR lines)
- [ ] **Every PRD FR** referenced in at least one component
- [ ] **Every component** has Owner + Tech stack
- [ ] **ADR section** present with at least one decision
- [ ] **state.yaml updated** (pipeline.phases.arch.status = complete)
`,
    },
    {
      path: `${dir}/checklist-epics.md`,
      content: `# aped-epics — Completion Gate

- [ ] **Epics file written** to {{OUTPUT_DIR}}/epics.md
- [ ] **oracle-epics.sh** passed (0 ERROR lines)
- [ ] **Every PRD FR** covered by at least one epic
- [ ] **Every epic** has ≥ 1 story with a key
- [ ] **state.yaml updated** (pipeline.phases.epics.status = complete)
- [ ] **Story keys** follow format: epicN-storyN-slug
`,
    },
    {
      path: `${dir}/checklist-ux.md`,
      content: `# aped-ux — Completion Gate

- [ ] **UX files written** to {{OUTPUT_DIR}}/ux/
- [ ] **Screen inventory** present with ≥ 3 screens
- [ ] **Components list** present with ≥ 3 components
- [ ] **User flows** documented for each critical path
- [ ] **state.yaml updated** (pipeline.phases.ux.status = complete)
`,
    },
    {
      path: `${dir}/checklist-ship.md`,
      content: `# aped-ship — Completion Gate

- [ ] **All story PRs merged** (no open PRs for this sprint)
- [ ] **Umbrella PR created** (if sprint mode)
- [ ] **CI green** on umbrella/main
- [ ] **Tickets closed** (all sprint tickets → Done)
- [ ] **state.yaml updated** (pipeline.phases.ship.status = complete)
- [ ] **CHANGELOG updated** (if applicable)
`,
    },
    {
      path: `${dir}/checklist-sprint.md`,
      content: `# aped-sprint — Completion Gate

- [ ] **Worktrees created** (one per story)
- [ ] **Stories dispatched** to story leaders
- [ ] **Lead Dev checkin inbox** initialized
- [ ] **state.yaml updated** (sprint.active = true)
- [ ] **Tickets created** (if ticket_system != none: one per story)
`,
    },
    {
      path: `${dir}/checklist-debug.md`,
      content: `# aped-debug — Completion Gate

- [ ] **Bug reproduced** (reproduction steps verified)
- [ ] **Root cause identified** (not just symptoms)
- [ ] **Regression test written** (test that fails without the fix)
- [ ] **Fix applied** with RED→GREEN cycle
- [ ] **Debug instrumentation removed** (no leftover console.log, [DEBUG-*])
- [ ] **Original reproduction loop** re-run and passes
`,
    },
    {
      path: `${dir}/checklist-brainstorm.md`,
      content: `# aped-brainstorm — Completion Gate

- [ ] **Phase 4 grounding table** completed for each survivor
- [ ] **Phase 5 output** has all 3 named blocks (Assumptions / Unknowns / Out of scope)
- [ ] **No "strong intuition"** basis in any survivor (disqualified per 4.11.0)
- [ ] **Brainstorm file written** to {{OUTPUT_DIR}}/
`,
    },
    {
      path: `${dir}/checklist-analyze.md`,
      content: `# aped-analyze — Completion Gate

- [ ] **Analysis file written** to {{OUTPUT_DIR}}/
- [ ] **Existing codebase scanned** (if brownfield)
- [ ] **Dependencies identified**
- [ ] **state.yaml updated** (pipeline.phases.analyze.status = complete)
`,
    },
    {
      path: `${dir}/checklist-from-ticket.md`,
      content: `# aped-from-ticket — Completion Gate

- [ ] **Ticket fetched** from provider (not invented)
- [ ] **Ticket assigned** to current user
- [ ] **Scope check** completed (in-scope or routed to .out-of-scope/)
- [ ] **Downstream skill identified** and stated to user
`,
    },
    {
      path: `${dir}/checklist-receive-review.md`,
      content: `# aped-receive-review — Completion Gate

- [ ] **PR comments fetched** (not invented from memory)
- [ ] **Each comment classified** (fix / discuss / decline)
- [ ] **Fixes applied** with test coverage
- [ ] **PR updated** (push + comment response per reviewer)
- [ ] **Ticket status unchanged** (receive-review doesn't close tickets)
`,
    },
    {
      path: `${dir}/checklist-retro.md`,
      content: `# aped-retro — Completion Gate

- [ ] **Retro report written** to {{OUTPUT_DIR}}/
- [ ] **Lessons extracted** (what went well / what didn't / action items)
- [ ] **Action items** have owners and deadlines
- [ ] **state.yaml updated** (pipeline.phases.retro.status = complete)
`,
    },
    {
      path: `${dir}/checklist-prfaq.md`,
      content: `# aped-prfaq — Completion Gate

- [ ] **PRFAQ document written** to {{OUTPUT_DIR}}/
- [ ] **Press release section** complete
- [ ] **FAQ section** with ≥ 5 questions
- [ ] **Feasibility assessment** stated
`,
    },
  ];
}
