export function commands(c) {
  const a = c.apedDir;
  return [
    {
      path: `${c.commandsDir}/aped-a.md`,
      content: `---
name: aped-a
description: 'Analyzes a new project idea through parallel market, domain, and technical research. Use when user says "research idea", "aped analyze", or invokes /aped-a. Not for existing codebases — use aped-ctx for brownfield projects.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-a/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-p.md`,
      content: `---
name: aped-p
description: 'Generates PRD autonomously from product brief. Use when user says "create PRD", "generate PRD", "aped prd", or invokes /aped-p.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-p/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-e.md`,
      content: `---
name: aped-e
description: 'Creates epics and stories from PRD with full FR coverage. Use when user says "create epics", "break into stories", "aped epics", or invokes /aped-e.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-e/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-d.md`,
      content: `---
name: aped-d
description: 'Implements next story with TDD red-green-refactor cycle. Use when user says "start dev", "implement story", "aped dev", or invokes /aped-d.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-d/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-r.md`,
      content: `---
name: aped-r
description: 'Reviews completed stories adversarially with minimum 3 findings. Use when user says "review code", "run review", "aped review", or invokes /aped-r.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-r/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-ux.md`,
      content: `---
name: aped-ux
description: 'Designs UX specifications from PRD — screen flows, wireframes, component inventory. Use when user says "design UX", "create wireframes", "UX spec", "aped ux", or invokes /aped-ux. Runs between PRD and Epics phases.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-ux/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-s.md`,
      content: `---
name: aped-s
description: 'Shows sprint status dashboard with progress, blockers, and next actions. Use when user says "sprint status", "show progress", "aped status", or invokes /aped-s.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-s/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-c.md`,
      content: `---
name: aped-c
description: 'Manages scope changes and pivots during development with impact analysis. Use when user says "correct course", "change scope", "pivot", "aped correct", or invokes /aped-c.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-c/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-ctx.md`,
      content: `---
name: aped-ctx
description: 'Analyzes existing codebase to generate project context for brownfield development. Use when user says "document codebase", "project context", "existing project", "aped context", or invokes /aped-ctx. Not for new project ideation — use aped-a for greenfield.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-ctx/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-qa.md`,
      content: `---
name: aped-qa
description: 'Generates E2E and integration tests from acceptance criteria for completed features. Use when user says "generate tests", "E2E tests", "integration tests", "aped qa", or invokes /aped-qa.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-qa/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-quick.md`,
      content: `---
name: aped-quick
description: 'Implements quick fixes and small features bypassing the full pipeline. Use when user says "quick fix", "quick feature", "hotfix", "aped quick", or invokes /aped-quick.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-quick/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-all.md`,
      content: `---
name: aped-all
description: 'Runs the full APED pipeline from Analyze through Review with auto-resume. Use when user says "run full pipeline", "aped all", or invokes /aped-all.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-all/SKILL.md
`,
    },
  ];
}
