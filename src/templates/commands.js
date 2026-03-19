export function commands(c) {
  const a = c.apedDir;
  return [
    {
      path: `${c.commandsDir}/aped-a.md`,
      content: `---
name: aped-a
description: 'Analyze project through parallel research. Use when user says "analyze", "research project", or "aped analyze"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-a/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-p.md`,
      content: `---
name: aped-p
description: 'Generate PRD from product brief. Use when user says "create PRD", "generate PRD", or "aped prd"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-p/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-e.md`,
      content: `---
name: aped-e
description: 'Create epics and stories from PRD. Use when user says "create epics", "break into stories", or "aped epics"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-e/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-d.md`,
      content: `---
name: aped-d
description: 'Dev sprint - implement next story with TDD. Use when user says "start dev", "implement story", or "aped dev"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-d/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-r.md`,
      content: `---
name: aped-r
description: 'Adversarial code review for completed story. Use when user says "review code", "run review", or "aped review"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-r/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-s.md`,
      content: `---
name: aped-s
description: 'Sprint status dashboard. Use when user says "sprint status", "show progress", "what is done", or "aped status"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-s/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-c.md`,
      content: `---
name: aped-c
description: 'Correct course — manage scope changes mid-pipeline. Use when user says "correct course", "change scope", "pivot", or "aped correct"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-c/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-ctx.md`,
      content: `---
name: aped-ctx
description: 'Analyze existing codebase for project context. Use when user says "analyze project", "document codebase", "project context", or "aped context"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-ctx/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-qa.md`,
      content: `---
name: aped-qa
description: 'Generate E2E and integration tests. Use when user says "generate tests", "E2E tests", "integration tests", or "aped qa"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-qa/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-quick.md`,
      content: `---
name: aped-quick
description: 'Quick fix/feature bypassing full pipeline. Use when user says "quick fix", "quick feature", "aped quick", or "hotfix"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-quick/SKILL.md
`,
    },
    {
      path: `${c.commandsDir}/aped-all.md`,
      content: `---
name: aped-all
description: 'Run full APED pipeline (Analyze>PRD>Epics>Dev>Review). Use when user says "run full pipeline", "aped all", or "start from scratch"'
---

Read and follow the SKILL.md at $PROJECT_ROOT/${a}/aped-all/SKILL.md
`,
    },
  ];
}
