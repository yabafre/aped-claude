# APED Command Catalog

> Generated from `src/templates/commands.js` by `npm run generate:catalog`.

This file is the committed source-of-truth view of the APED command surface.

## Pipeline Commands

Core phase commands in the APED delivery flow.

| Command | Phase | Arguments | Purpose | Outputs |
|---------|-------|-----------|---------|---------|
| `/aped-analyze` | Analyze | - | Analyzes a new project idea through parallel market, domain, and technical research. Use when user says "research idea", "aped analyze", or invokes /aped-analyze. Not for existing codebases — use aped-context for brownfield projects. | Product brief and seeded discovery context. |
| `/aped-prd` | PRD | [--headless] | Generates PRD section-by-section with user review at each step (interactive by default; --headless for autonomous). Use when user says "create PRD", "generate PRD", "aped prd", or invokes /aped-prd. | PRD with FRs, NFRs, and validation-ready structure. |
| `/aped-arch` | Architecture | - | Collaborative architecture decisions for consistent implementation. Use when user says "create architecture", "technical architecture", "solution design", or invokes /aped-arch. | Architecture decisions, implementation patterns, and structure. |
| `/aped-epics` | Epics | - | Creates epic structure and story list from PRD. Does NOT create story files — use /aped-story for that. Use when user says "create epics", "aped epics", or invokes /aped-epics. | Epic map, story list, and FR coverage. |
| `/aped-story` | Story | [story-key] | Creates a detailed story file for the next story to implement. Use when user says "create story", "prepare next story", "aped story", or invokes /aped-story. | One implementation-ready story file. |
| `/aped-dev` | Dev | [story-key] | Implements next story with TDD red-green-refactor cycle. Use when user says "start dev", "implement story", "aped dev", or invokes /aped-dev. | Code, tests, and updated story execution notes. |
| `/aped-review` | Review | [story-key] | Reviews completed stories adversarially with minimum 3 findings. Use when user says "review code", "run review", "aped review", or invokes /aped-review. | Review findings and a done-or-return verdict. |
| `/aped-ux` | UX | - | Designs UX via the ANF framework (Assemble design system, Normalize with React preview, Fill all screens). Use when user says "design UX", "UX spec", "aped ux", or invokes /aped-ux. Runs between PRD and Epics phases. | UX spec, flows, and prototype assets. |

## Ideation, Critique & Retrospective

Upstream or horizontal commands that sharpen ideas and decisions.

| Command | Phase | Arguments | Purpose | Outputs |
|---------|-------|-----------|---------|---------|
| `/aped-brainstorm` | Upstream | [topic] | Structured brainstorming with diverse creative techniques to generate 100+ ideas before convergence. Use when user says "brainstorm", "help me ideate", "explore ideas". Runs before /aped-analyze when the idea is still fuzzy. | Brainstorm session notes and divergent idea set. |
| `/aped-prfaq` | Upstream | [--headless] | Working Backwards challenge: press release, customer FAQ, internal FAQ, verdict. Stress-tests product concepts before commit. Use when user says "PRFAQ", "work backwards", "press release first". Optional upstream of /aped-analyze. | PRFAQ package and a sharpened concept. |
| `/aped-retro` | Post-epic | [epic-number] | Post-epic retrospective: extracts systemic lessons, assesses readiness, detects significant discoveries. Use when user says "retro", "retrospective", "review the epic". | Retro report, lessons, and action items. |
| `/aped-elicit` | Horizontal | [method-name \| target-file] | Advanced critique toolkit (socratic, first principles, pre-mortem, red team, tree of thoughts...). Horizontally invokable in any phase. Use when user says "critique this", "stress-test", "deeper review", "socratic", "pre-mortem", "red team". | Structured critique pass using a chosen method. |

## Utility Commands

Operational commands around sprint execution, maintenance, and meta-work.

| Command | Phase | Arguments | Purpose | Outputs |
|---------|-------|-----------|---------|---------|
| `/aped-sprint` | Sprint | [story-keys...] | Dispatches multiple stories in parallel via git worktrees. Use when user says "parallel sprint", "dispatch stories", "aped sprint", or invokes /aped-sprint. Only runs from the main project. | Parallel worktree dispatch plan and story-ready check-ins. |
| `/aped-lead` | Sprint | - | Lead Dev hub for parallel sprints. Batch-processes Story Leader check-ins, auto-approves what is safe, escalates what is not, and pushes the next command into each worktree. Use when user says "lead", "approvals", "aped lead", or invokes /aped-lead. Only runs from the main project. | Approved transitions, escalations, and next-step dispatches. |
| `/aped-ship` | Sprint | - | End-of-sprint batch merge + pre-push composite review on main. Merges all done stories in conflict-minimizing order, runs secret scan, typecheck, lint, db:generate, state.yaml + worktree consistency. Never pushes — HALTs for user. Use when user says "ship", "merge sprint", "pre-push", "aped ship", or invokes /aped-ship. Only runs from the main project on the main branch. | Merge order, composite verification, and a push-ready halt. |
| `/aped-status` | Sprint | - | Shows sprint status dashboard with progress, blockers, and next actions. Use when user says "sprint status", "show progress", "aped status", or invokes /aped-status. | Status dashboard with blockers and next actions. |
| `/aped-course` | Sprint | [description of the change] | Manages scope changes and pivots during development with impact analysis. Use when user says "correct course", "change scope", "pivot", "aped correct", or invokes /aped-course. | Impact analysis and coordinated scope-change plan. |
| `/aped-context` | Brownfield | - | Analyzes existing codebase to generate project context for brownfield development. Use when user says "document codebase", "project context", "existing project", "aped context", or invokes /aped-context. Not for new project ideation — use aped-analyze for greenfield. | Project context for existing codebases. |
| `/aped-qa` | QA | [story-key] | Generates E2E and integration tests from acceptance criteria for completed features. Use when user says "generate tests", "E2E tests", "integration tests", "aped qa", or invokes /aped-qa. | E2E and integration test artifacts. |
| `/aped-quick` | Quick | <title> [fix\|feature\|refactor] | Implements quick fixes and small features bypassing the full pipeline. Use when user says "quick fix", "quick feature", "hotfix", "aped quick", or invokes /aped-quick. | Quick-spec execution and focused code changes. |
| `/aped-check` | Review | - | Human-in-the-loop checkpoint. Summarizes recent changes, highlights concerns, and halts for user review. Use when user says "checkpoint", "review changes", "walk me through this". | Checkpoint summary and approval halt. |
| `/aped-claude` | Meta | - | Update CLAUDE.md with APED working rules and project config. Smart merge — preserves user content. Use when user says "update CLAUDE.md", "sync claude rules", "aped claude". | Updated CLAUDE.md with merged APED rules. |

