// Slash command definitions. The body of every command reads the matching
// SKILL.md under `${apedDir}/aped-{name}/SKILL.md`, so the command file stays
// minimal and all real logic lives in the skill.
const COMMAND_DEFS = [
  {
    name: 'aped-analyze',
    skill: 'aped-analyze',
    description: 'Analyzes a new project idea through parallel market, domain, and technical research. Use when user says "research idea", "aped analyze", or invokes /aped-analyze. Not for existing codebases — use aped-context for brownfield projects.',
  },
  {
    name: 'aped-prd',
    skill: 'aped-prd',
    description: 'Generates PRD autonomously from product brief. Use when user says "create PRD", "generate PRD", "aped prd", or invokes /aped-prd.',
  },
  {
    name: 'aped-arch',
    skill: 'aped-arch',
    description: 'Collaborative architecture decisions for consistent implementation. Use when user says "create architecture", "technical architecture", "solution design", or invokes /aped-arch.',
  },
  {
    name: 'aped-epics',
    skill: 'aped-epics',
    description: 'Creates epic structure and story list from PRD. Does NOT create story files — use /aped-story for that. Use when user says "create epics", "aped epics", or invokes /aped-epics.',
  },
  {
    name: 'aped-story',
    skill: 'aped-story',
    description: 'Creates a detailed story file for the next story to implement. Use when user says "create story", "prepare next story", "aped story", or invokes /aped-story.',
    argumentHint: '[story-key]',
  },
  {
    name: 'aped-dev',
    skill: 'aped-dev',
    description: 'Implements next story with TDD red-green-refactor cycle. Use when user says "start dev", "implement story", "aped dev", or invokes /aped-dev.',
    argumentHint: '[story-key]',
  },
  {
    name: 'aped-review',
    skill: 'aped-review',
    description: 'Reviews completed stories adversarially with minimum 3 findings. Use when user says "review code", "run review", "aped review", or invokes /aped-review.',
    argumentHint: '[story-key]',
  },
  {
    name: 'aped-ux',
    skill: 'aped-ux',
    description: 'Designs UX via the ANF framework (Assemble design system, Normalize with React preview, Fill all screens). Use when user says "design UX", "UX spec", "aped ux", or invokes /aped-ux. Runs between PRD and Epics phases.',
  },
  {
    name: 'aped-sprint',
    skill: 'aped-sprint',
    description: 'Dispatches multiple stories in parallel via git worktrees. Use when user says "parallel sprint", "dispatch stories", "aped sprint", or invokes /aped-sprint. Only runs from the main project.',
    argumentHint: '[story-keys...]',
  },
  {
    name: 'aped-lead',
    skill: 'aped-lead',
    description: 'Lead Dev hub for parallel sprints. Batch-processes Story Leader check-ins, auto-approves what is safe, escalates what is not, and pushes the next command into each worktree. Use when user says "lead", "approvals", "aped lead", or invokes /aped-lead. Only runs from the main project.',
  },
  {
    name: 'aped-status',
    skill: 'aped-status',
    description: 'Shows sprint status dashboard with progress, blockers, and next actions. Use when user says "sprint status", "show progress", "aped status", or invokes /aped-status.',
  },
  {
    name: 'aped-course',
    skill: 'aped-course',
    description: 'Manages scope changes and pivots during development with impact analysis. Use when user says "correct course", "change scope", "pivot", "aped correct", or invokes /aped-course.',
    argumentHint: '[description of the change]',
  },
  {
    name: 'aped-context',
    skill: 'aped-context',
    description: 'Analyzes existing codebase to generate project context for brownfield development. Use when user says "document codebase", "project context", "existing project", "aped context", or invokes /aped-context. Not for new project ideation — use aped-analyze for greenfield.',
  },
  {
    name: 'aped-qa',
    skill: 'aped-qa',
    description: 'Generates E2E and integration tests from acceptance criteria for completed features. Use when user says "generate tests", "E2E tests", "integration tests", "aped qa", or invokes /aped-qa.',
    argumentHint: '[story-key]',
  },
  {
    name: 'aped-quick',
    skill: 'aped-quick',
    description: 'Implements quick fixes and small features bypassing the full pipeline. Use when user says "quick fix", "quick feature", "hotfix", "aped quick", or invokes /aped-quick.',
    argumentHint: '<title> [fix|feature|refactor]',
  },
  {
    name: 'aped-check',
    skill: 'aped-checkpoint',
    description: 'Human-in-the-loop checkpoint. Summarizes recent changes, highlights concerns, and halts for user review. Use when user says "checkpoint", "review changes", "walk me through this".',
  },
  {
    name: 'aped-claude',
    skill: 'aped-claude',
    description: 'Update CLAUDE.md with APED working rules and project config. Smart merge — preserves user content. Use when user says "update CLAUDE.md", "sync claude rules", "aped claude".',
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
