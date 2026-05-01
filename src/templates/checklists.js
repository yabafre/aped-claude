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

- [ ] **Branch created** before any code writes (not on main)
- [ ] **RED witnessed** for every new test (Confirmed RED token emitted)
- [ ] **GREEN confirmed** (test runner exit 0, output visible in transcript)
- [ ] **One commit per task** (not batched at the end)
- [ ] **No --no-verify** on any commit (pre-commit hooks must run)
- [ ] **last-test-exit cache** updated (.aped/.last-test-exit = 0)
- [ ] **Story file status** updated to review (not still ready-for-dev)
- [ ] **state.yaml updated** (pipeline.phases.dev.status = complete)
- [ ] **Ticket synced** (if ticket_system != none: status → In Review, comment with summary)
- [ ] **PR created** with link to story (if not worktree mode)
`,
    },
    {
      path: `${dir}/checklist-story.md`,
      content: `# aped-story — Completion Gate

- [ ] **Branch created** before writing story file
- [ ] **Story file written** to {{OUTPUT_DIR}}/stories/
- [ ] **state.yaml updated** (pipeline.current_phase = stories)
- [ ] **Ticket synced** (if ticket_system != none: assign + post AC comment)
- [ ] **All ACs** have measurable acceptance criteria (no "should work well")
- [ ] **File list** matches architecture component map
`,
    },
    {
      path: `${dir}/checklist-review.md`,
      content: `# aped-review — Completion Gate

- [ ] **Fresh context** (not same session as implementation — if same, /clear first)
- [ ] **Stage 1 (Eva)** completed — AC validation verdict rendered
- [ ] **Stage 1.5** dispatched (if review.parallel_reviewers = true in config)
- [ ] **Stage 2** dispatched — all specialists returned findings
- [ ] **Final report written** to {{OUTPUT_DIR}}/
- [ ] **Verdict** clearly stated (APPROVED / CHANGES_REQUESTED)
- [ ] **Ticket status** updated (if ticket_system != none)
- [ ] **Story file status** updated to match verdict
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
