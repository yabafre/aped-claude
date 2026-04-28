// Slash command definitions. The body of every command reads the matching
// SKILL.md under `${apedDir}/aped-{name}/SKILL.md`, so the command file stays
// minimal and all real logic lives in the skill.
export const COMMAND_DEFS = [
  {
    name: 'aped-analyze',
    skill: 'aped-analyze',
    category: 'pipeline',
    phase: 'Analyze',
    description: 'Analyzes a project idea through parallel market, domain, and technical research. Detects greenfield vs brownfield from discovered artefacts — runs alongside /aped-context, not exclusive of it. Use when user says "research idea", "aped analyze", or invokes /aped-analyze.',
    outputs: 'Product brief and seeded discovery context.',
  },
  {
    name: 'aped-prd',
    skill: 'aped-prd',
    category: 'pipeline',
    phase: 'PRD',
    description: 'Generates PRD section-by-section with user review at each step (interactive by default; --headless for autonomous). Use when user says "create PRD", "generate PRD", "aped prd", or invokes /aped-prd.',
    argumentHint: '[--headless]',
    outputs: 'PRD with FRs, NFRs, and validation-ready structure.',
  },
  {
    name: 'aped-arch',
    skill: 'aped-arch',
    category: 'pipeline',
    phase: 'Architecture',
    description: 'Collaborative architecture decisions for consistent implementation. Use when user says "create architecture", "technical architecture", "solution design", or invokes /aped-arch.',
    outputs: 'Architecture decisions, implementation patterns, and structure.',
  },
  {
    name: 'aped-epics',
    skill: 'aped-epics',
    category: 'pipeline',
    phase: 'Epics',
    description: 'Creates epic structure and story list from PRD. Does NOT create story files — use /aped-story for that. Use when user says "create epics", "aped epics", or invokes /aped-epics.',
    outputs: 'Epic map, story list, and FR coverage.',
  },
  {
    name: 'aped-story',
    skill: 'aped-story',
    category: 'pipeline',
    phase: 'Story',
    description: 'Creates a detailed story file for the next story to implement. Use when user says "create story", "prepare next story", "aped story", or invokes /aped-story.',
    argumentHint: '[story-key]',
    outputs: 'One implementation-ready story file.',
  },
  {
    name: 'aped-dev',
    skill: 'aped-dev',
    category: 'pipeline',
    phase: 'Dev',
    description: 'Implements next story with TDD red-green-refactor cycle. Use when user says "start dev", "implement story", "aped dev", or invokes /aped-dev.',
    argumentHint: '[story-key]',
    outputs: 'Code, tests, and updated story execution notes.',
  },
  {
    name: 'aped-review',
    skill: 'aped-review',
    category: 'pipeline',
    phase: 'Review',
    description: 'Reviews completed stories adversarially with minimum 3 findings. Use when user says "review code", "run review", "aped review", or invokes /aped-review.',
    argumentHint: '[story-key]',
    outputs: 'Review findings and a done-or-return verdict.',
  },
  {
    name: 'aped-ux',
    skill: 'aped-ux',
    category: 'pipeline',
    phase: 'UX',
    description: 'Designs UX via the ANF framework (Assemble design system, Normalize with React preview, Fill all screens). Use when user says "design UX", "UX spec", "aped ux", or invokes /aped-ux. Runs between PRD and Epics phases.',
    outputs: 'UX spec, flows, and prototype assets.',
  },
  {
    name: 'aped-sprint',
    skill: 'aped-sprint',
    category: 'utility',
    phase: 'Sprint',
    description: 'Dispatches multiple stories in parallel via git worktrees. Use when user says "parallel sprint", "dispatch stories", "aped sprint", or invokes /aped-sprint. Only runs from the main project.',
    argumentHint: '[story-keys...]',
    outputs: 'Parallel worktree dispatch plan and story-ready check-ins.',
  },
  {
    name: 'aped-lead',
    skill: 'aped-lead',
    category: 'utility',
    phase: 'Sprint',
    description: 'Lead Dev hub for parallel sprints. Batch-processes Story Leader check-ins, auto-approves what is safe, escalates what is not, and pushes the next command into each worktree. Use when user says "lead", "approvals", "aped lead", or invokes /aped-lead. Only runs from the main project.',
    outputs: 'Approved transitions, escalations, and next-step dispatches.',
  },
  {
    name: 'aped-ship',
    skill: 'aped-ship',
    category: 'utility',
    phase: 'Sprint',
    description: 'End-of-sprint batch merge + pre-push composite review on main. Merges all done stories in conflict-minimizing order, runs secret scan, typecheck, lint, db:generate, state.yaml + worktree consistency. Never pushes — HALTs for user. Use when user says "ship", "merge sprint", "pre-push", "aped ship", or invokes /aped-ship. Only runs from the main project on the main branch.',
    outputs: 'Merge order, composite verification, and a push-ready halt.',
  },
  {
    name: 'aped-status',
    skill: 'aped-status',
    category: 'utility',
    phase: 'Sprint',
    description: 'Shows sprint status dashboard with progress, blockers, and next actions. Use when user says "sprint status", "show progress", "aped status", or invokes /aped-status.',
    outputs: 'Status dashboard with blockers and next actions.',
  },
  {
    name: 'aped-course',
    skill: 'aped-course',
    category: 'utility',
    phase: 'Sprint',
    description: 'Manages scope changes and pivots during development with impact analysis. Use when user says "correct course", "change scope", "pivot", "aped correct", or invokes /aped-course.',
    argumentHint: '[description of the change]',
    outputs: 'Impact analysis and coordinated scope-change plan.',
  },
  {
    name: 'aped-context',
    skill: 'aped-context',
    category: 'utility',
    phase: 'Brownfield',
    description: 'Analyzes an existing codebase and produces project-context.md, which downstream APED skills consume automatically when present. Runs alongside /aped-analyze, not exclusive of it — use both on hybrid projects (new feature in legacy system). Use when user says "document codebase", "project context", "existing project", "aped context", or invokes /aped-context.',
    outputs: 'Project context for existing codebases.',
  },
  {
    name: 'aped-qa',
    skill: 'aped-qa',
    category: 'utility',
    phase: 'QA',
    description: 'Generates E2E and integration tests from acceptance criteria for completed features. Use when user says "generate tests", "E2E tests", "integration tests", "aped qa", or invokes /aped-qa.',
    argumentHint: '[story-key]',
    outputs: 'E2E and integration test artifacts.',
  },
  {
    name: 'aped-quick',
    skill: 'aped-quick',
    category: 'utility',
    phase: 'Quick',
    description: 'Implements quick fixes and small features bypassing the full pipeline. Use when user says "quick fix", "quick feature", "hotfix", "aped quick", or invokes /aped-quick.',
    argumentHint: '<title> [fix|feature|refactor]',
    outputs: 'Quick-spec execution and focused code changes.',
  },
  {
    name: 'aped-debug',
    skill: 'aped-debug',
    category: 'utility',
    phase: 'Debug',
    description: 'Use when user says "debug", "troubleshoot", "why is X failing", "find the root cause", "aped debug", or invokes /aped-debug. Also invoked from /aped-dev on persistent test red (≥3 failed attempts) and from /aped-review on findings that need root-cause investigation.',
    outputs: 'Reproducible failure, confirmed root cause, regression test, and verified fix.',
  },
  {
    name: 'aped-from-ticket',
    skill: 'aped-from-ticket',
    category: 'utility',
    phase: 'Intake',
    description: 'Pulls a ticket from the configured ticket system, drafts a story conformant to the project, integrates it into the sprint state, and (optionally) comments back on the ticket. Use when user says "from ticket", "pickup ticket", "ingest ticket", "aped from-ticket", or invokes /aped-from-ticket.',
    argumentHint: '<ticket-id-or-url>',
    outputs: 'Story file, sprint registration, and optional ticket comment.',
  },
  {
    name: 'aped-check',
    skill: 'aped-checkpoint',
    category: 'utility',
    phase: 'Review',
    description: 'Human-in-the-loop checkpoint. Summarizes recent changes, highlights concerns, and halts for user review. Use when user says "checkpoint", "review changes", "walk me through this".',
    outputs: 'Checkpoint summary and approval halt.',
  },
  {
    name: 'aped-claude',
    skill: 'aped-claude',
    category: 'utility',
    phase: 'Meta',
    description: 'Update CLAUDE.md with APED working rules and project config. Smart merge — preserves user content. Use when user says "update CLAUDE.md", "sync claude rules", "aped claude".',
    outputs: 'Updated CLAUDE.md with merged APED rules.',
  },
  {
    name: 'aped-brainstorm',
    skill: 'aped-brainstorm',
    category: 'ideation',
    phase: 'Upstream',
    description: 'Structured brainstorming with diverse creative techniques to generate 100+ ideas before convergence. Use when user says "brainstorm", "help me ideate", "explore ideas". Runs before /aped-analyze when the idea is still fuzzy.',
    argumentHint: '[topic]',
    outputs: 'Brainstorm session notes and divergent idea set.',
  },
  {
    name: 'aped-prfaq',
    skill: 'aped-prfaq',
    category: 'ideation',
    phase: 'Upstream',
    description: 'Working Backwards challenge: press release, customer FAQ, internal FAQ, verdict. Stress-tests product concepts before commit. Use when user says "PRFAQ", "work backwards", "press release first". Optional upstream of /aped-analyze.',
    argumentHint: '[--headless]',
    outputs: 'PRFAQ package and a sharpened concept.',
  },
  {
    name: 'aped-retro',
    skill: 'aped-retro',
    category: 'ideation',
    phase: 'Post-epic',
    description: 'Post-epic retrospective: extracts systemic lessons, assesses readiness, detects significant discoveries. Use when user says "retro", "retrospective", "review the epic".',
    argumentHint: '[epic-number]',
    outputs: 'Retro report, lessons, and action items.',
  },
  {
    name: 'aped-elicit',
    skill: 'aped-elicit',
    category: 'ideation',
    phase: 'Horizontal',
    description: 'Advanced critique toolkit (socratic, first principles, pre-mortem, red team, tree of thoughts...). Horizontally invokable in any phase. Use when user says "critique this", "stress-test", "deeper review", "socratic", "pre-mortem", "red team".',
    argumentHint: '[method-name | target-file]',
    outputs: 'Structured critique pass using a chosen method.',
  },
];

function renderFrontmatter({ name, description, argumentHint }) {
  const lines = [
    '---',
    `name: ${name}`,
    `description: '${description.replace(/'/g, "''")}'`,
  ];
  if (argumentHint) lines.push(`argument-hint: "${argumentHint}"`);
  lines.push('---');
  return lines.join('\n');
}

export function commands(c) {
  const a = c.apedDir;
  return COMMAND_DEFS.map((def) => ({
    path: `${c.commandsDir}/${def.name}.md`,
    content: `${renderFrontmatter(def)}

Read and follow the SKILL.md at \${CLAUDE_PROJECT_DIR}/${a}/${def.skill}/SKILL.md
`,
  }));
}
