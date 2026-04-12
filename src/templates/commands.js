export function commands(c) {
  const a = c.apedDir;
  return [
    {
      path: `${c.commandsDir}/aped-analyze.md`,
      content: `---
name: aped-analyze
description: 'Analyzes a new project idea through parallel market, domain, and technical research. Use when user says "research idea", "aped analyze", or invokes /aped-analyze. Not for existing codebases — use aped-context for brownfield projects.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-analyze/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-prd.md`,
      content: `---
name: aped-prd
description: 'Generates PRD autonomously from product brief. Use when user says "create PRD", "generate PRD", "aped prd", or invokes /aped-prd.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-prd/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-arch.md`,
      content: `---
name: aped-arch
description: 'Collaborative architecture decisions for consistent implementation. Use when user says "create architecture", "technical architecture", "solution design", or invokes /aped-arch.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-arch/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-epics.md`,
      content: `---
name: aped-epics
description: 'Creates epic structure and story list from PRD. Does NOT create story files — use /aped-story for that. Use when user says "create epics", "aped epics", or invokes /aped-epics.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-epics/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-story.md`,
      content: `---
name: aped-story
description: 'Creates a detailed story file for the next story to implement. Use when user says "create story", "prepare next story", "aped story", or invokes /aped-story.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-story/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-dev.md`,
      content: `---
name: aped-dev
description: 'Implements next story with TDD red-green-refactor cycle. Use when user says "start dev", "implement story", "aped dev", or invokes /aped-dev.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-dev/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-review.md`,
      content: `---
name: aped-review
description: 'Reviews completed stories adversarially with minimum 3 findings. Use when user says "review code", "run review", "aped review", or invokes /aped-review.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-review/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-ux.md`,
      content: `---
name: aped-ux
description: 'Designs UX via the ANF framework (Assemble design system, Normalize with React preview, Fill all screens). Use when user says "design UX", "UX spec", "aped ux", or invokes /aped-ux. Runs between PRD and Epics phases.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-ux/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-status.md`,
      content: `---
name: aped-status
description: 'Shows sprint status dashboard with progress, blockers, and next actions. Use when user says "sprint status", "show progress", "aped status", or invokes /aped-status.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-status/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-course.md`,
      content: `---
name: aped-course
description: 'Manages scope changes and pivots during development with impact analysis. Use when user says "correct course", "change scope", "pivot", "aped correct", or invokes /aped-course.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-course/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-context.md`,
      content: `---
name: aped-context
description: 'Analyzes existing codebase to generate project context for brownfield development. Use when user says "document codebase", "project context", "existing project", "aped context", or invokes /aped-context. Not for new project ideation — use aped-analyze for greenfield.'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-context/SKILL.md
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
      path: `${c.commandsDir}/aped-check.md`,
      content: `---
name: aped-check
description: 'Human-in-the-loop checkpoint. Summarizes recent changes, highlights concerns, and halts for user review. Use when user says "checkpoint", "review changes", "walk me through this".'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-checkpoint/SKILL.md
`,
    },
  ];
}
