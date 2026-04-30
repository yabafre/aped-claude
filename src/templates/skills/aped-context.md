---
name: aped-context
keep-coding-instructions: true
description: 'Use when user says "document codebase", "project context", "existing project", "aped context", or invokes aped-context. Runs alongside aped-analyze — both can apply on hybrid projects (new feature in legacy system).'
allowed-tools: "Read Grep Glob Bash"
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Context — Brownfield Project Analysis

Use on existing codebases to generate `project-context.md`. Other APED skills (`aped-analyze`, `aped-prd`, `aped-ux`, `aped-arch`, etc.) discover this file automatically at entry and bias their behaviour accordingly. You can run this skill before, after, or instead of `aped-analyze` — they are no longer mutually exclusive. Hybrid projects (a new feature in a legacy system) benefit from running both.

## Setup

1. Read `{{APED_DIR}}/config.yaml` — extract config
2. Confirm there is existing code to analyse (if the directory is empty / freshly initialised, tell the user this skill produces no useful output — they should run `aped-analyze` instead)
3. Read `{{APED_DIR}}aped-context/references/analysis-checklist.md` for the full analysis checklist

## Codebase Analysis

### Phase 1: Structure Discovery

Scan the project root:
- Detect language/framework from config files (package.json, Cargo.toml, go.mod, pyproject.toml, etc.)
- Map directory structure (max 3 levels deep)
- Identify entry points, main modules, config files
- Count: files, LOC, languages used

### Phase 2: Architecture Mapping

- Identify architectural pattern (MVC, hexagonal, microservices, monolith, etc.)
- Map data flow: entry point → processing → storage → response
- List external dependencies and integrations (APIs, databases, queues, caches)
- Identify test framework and coverage approach

### Phase 3: Convention Extraction

- Naming conventions (files, functions, variables, classes)
- Code organization patterns (feature-based, layer-based, domain-based)
- Error handling patterns
- Logging approach
- Config management (env vars, config files, secrets)

### Phase 4: Dependency Audit

- List production dependencies with versions
- Flag outdated or deprecated packages
- Identify security advisories (if available)
- Note lock file type (package-lock, yarn.lock, pnpm-lock, etc.)

## Self-review (run before user gate)

Before presenting the project context to the user, walk this checklist. Each `[ ]` must flip to `[x]` or HALT.

- [ ] **Placeholder lint** — run `bash {{APED_DIR}}/scripts/lint-placeholders.sh {{OUTPUT_DIR}}/project-context.md`.
- [ ] **Tech stack complete** — every primary language, framework, and major dependency is listed (downstream skills treat this as the definitive list).
- [ ] **Conventions concrete** — named patterns and concrete examples, not "follow standard practices".
- [ ] **Integration points enumerated** — every external system the project talks to (APIs, databases, queues) appears with its role.
- [ ] **No bare "see the codebase"** — if a convention exists, name it; if it doesn't, say so explicitly.

## Output

Write project context to `{{OUTPUT_DIR}}/project-context.md`:

```markdown
# Project Context: {project_name}

## Tech Stack
- Language: {lang} {version}
- Framework: {framework} {version}
- Database: {db}
- Test Framework: {test_framework}

## Architecture
- Pattern: {pattern}
- Entry Point: {entry}
- Key Modules: {modules}

## Conventions
- File naming: {convention}
- Code style: {style}
- Error handling: {pattern}

## Dependencies
| Package | Version | Purpose |
|---------|---------|---------|

## Integration Points
- {service}: {purpose}

## Notes for Development
- {important context for new feature development}
```

## State Update

Update `{{OUTPUT_DIR}}/state.yaml` under `pipeline.phases.context` with the structured fields below. The block is the canonical record of *which* kind of project this is — downstream skills read `type` to decide whether to apply brownfield bias.

```yaml
pipeline:
  phases:
    context:
      generated: true
      path: "docs/project-context.md"
      type: "brownfield"        # brownfield | greenfield | hybrid
      generated_at: "<YYYY-MM-DD>"   # set on FIRST run; preserved across re-runs
      refreshed_at: "<YYYY-MM-DD>"   # set on every run (including the first)
```

### `type` derivation rules

- `type: "brownfield"` — existing repository with code already present (Phase 1 found a non-trivial source tree, package files like `package.json` / `Cargo.toml` / `pyproject.toml`, multiple modules, prior commits beyond scaffolding).
- `type: "greenfield"` — empty repository or scaffold-only (no source code beyond what `create-aped` / template generators produced; commit history is just the initial scaffolding).
- `type: "hybrid"` — mixed: a new module/feature is being grafted onto an existing system (e.g. greenfield `apps/new-feature/` inside a brownfield monorepo). Use `hybrid` when the user has explicitly framed the work as "new feature in legacy system" OR when Phase 1 finds both legacy modules with mature conventions AND fresh scaffold areas with none.

### `generated_at` vs `refreshed_at`

- On the **first** run, set both `generated_at` and `refreshed_at` to today (YYYY-MM-DD).
- On a **re-run** (the existing `phases.context.generated_at` is already set), preserve `generated_at` verbatim and only update `refreshed_at` to today. Do not overwrite `generated_at` — it's the original-context anchor.

## Next Steps

The generated `project-context.md` is now discoverable by every downstream APED skill. Suggest based on what the user has already produced:
- No brief yet → run `aped-analyze` (it will discover and consume the context automatically — no flag needed)
- Brief exists, no PRD → run `aped-prd` (same — auto-consumes the context)
- PRD exists → context will be picked up by `aped-arch`, `aped-ux`, `aped-dev`, `aped-review`, `aped-from-ticket`

## Example

Scanning a Next.js SaaS project → project-context.md:
- Stack: TypeScript, Next.js 14, Prisma, PostgreSQL
- Pattern: App Router, server components, feature-based folders
- Conventions: camelCase files, Zod validation, Tailwind CSS
- 45 dependencies, 3 outdated, 0 security advisories

## Common Issues

- **No package.json/Cargo.toml found**: Project may be multi-language or unconventional — scan for entry points manually
- **Very large codebase (>1000 files)**: Focus on src/ and key config files, don't scan node_modules or build output
- **Monorepo detected**: Document each package/app separately in the context file
