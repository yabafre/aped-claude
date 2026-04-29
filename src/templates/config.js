export function configFiles(c) {
  const a = c.apedDir;
  const o = c.outputDir;
  const ts = c.ticketSystem || 'none';
  const gp = c.gitProvider || 'github';
  const ver = c.cliVersion || '0.0.0';
  return [
    {
      path: `${a}/config.yaml`,
      content: `# APED Project Configuration
project_name: ${c.projectName}
user_name: ${c.authorName}
communication_language: ${c.communicationLang}
document_output_language: ${c.documentLang}
aped_path: ${a}
output_path: ${o}
aped_version: ${ver}

# Integrations
ticket_system: ${ts}
git_provider: ${gp}

# aped-from-ticket — external ticket intake
# All keys are optional; defaults shown below kick in when absent.
from_ticket:
  story_placement:
    # mode: bucket | auto_match | ask
    #   bucket     — always place under bucket_epic
    #   auto_match — score against existing epics, fallback to bucket
    #   ask        — present candidates + bucket, let user pick
    mode: ask
    # Epic key used when placement falls back to (or chooses) the bucket.
    bucket_epic: external-tickets
  ticket_comment:
    # When true, post a comment on the source ticket after the story is drafted.
    # Off by default to avoid noisy notifications during initial use.
    enabled: false
    # Template for the comment body. {story_path} is substituted at runtime.
    template: "Picked up — story drafted at {story_path}"
  sprint_integration:
    # When true, the new story is appended to the active sprint's ordering.
    # Off by default — the user explicitly promotes the story when ready.
    auto_add: false
  handoff:
    # after_story: ask | stop | continue_to_dev
    #   ask              — present [D]ev / [P]romote / [S]top options
    #   stop             — report path and exit
    #   continue_to_dev  — invoke aped-dev directly (no confirmation)
    after_story: ask

# Artefact placeholder lint — runs from the Self-review block of every
# artefact-producing skill (PRD, architecture, story, epics, UX, retro,
# brainstorm, prfaq, project-context, from-ticket).
# Set enabled: false to opt out across all skills (e.g. for projects that
# legitimately use TODO/TBD as in-document trackers).
placeholder_lint:
  enabled: true

# Skill-invocation discipline (Tier 4). Governs whether the
# "## Skill Invocation Discipline" block is rendered into CLAUDE.md by the
# scaffold/update flow. Defaults on — it carries the 1%-rule and the
# rationalization table that keep \`aped-*\` skill triggers honest.
skill_invocation_discipline:
  enabled: true   # If false, the CLAUDE.md "Skill Invocation Discipline" block is omitted.

# Visual companion server for aped-brainstorm (opt-in, Tier 4).
# Installation is gated on \`aped-method visual-companion\` so the default
# scaffold ships nothing on disk; this block only configures the server
# once the user opts in.
visual_companion:
  enabled: false  # Opt-in. Install via 'aped-method visual-companion'.
  port: 3737      # HTTP port for the brainstorm visual companion server.

# Sync-log audit trail (Tier 6, 3.12.0). Ticket-system operations in
# aped-epics, aped-from-ticket, aped-ship and aped-course emit a
# structured JSON log per sync via aped/scripts/sync-log.sh. Set
# enabled: false to make the helper a silent no-op (every subcommand
# exits 0 with empty stdout — useful when you don't want forensic logs
# committed alongside the project, e.g. on personal scratch repos).
# \`dir\` is project-relative and auto-created on first \`start\`.
#
# Retention (4.1.0+, opt-in). When \`mode: keep_last_n\`, every successful
# \`sync-log.sh end\` prunes the oldest provider-scoped logs beyond \`keep_last_n\`
# (newest by mtime are kept). Default \`mode: none\` preserves the previous
# behaviour (logs accumulate forever). Use \`aped-method sync-logs prune\` for
# a one-shot cleanup; default is dry-run, \`--apply\` actually deletes.
sync_logs:
  enabled: true
  dir: "docs/sync-logs/"
  # retention:
  #   mode: keep_last_n      # none | keep_last_n
  #   keep_last_n: 50        # used when mode = keep_last_n

# State files (4.1.0+, schema v2). The corrections log was split out of
# state.yaml to bound its growth. \`corrections_path\` is project-relative
# and overrides the default below; state.yaml itself carries a
# \`corrections_pointer\` that wins at runtime, so a config edit cannot
# desync from already-written corrections. To move the file safely,
# edit BOTH this key and the pointer inside state.yaml in lock-step.
state:
  corrections_path: "docs/state-corrections.yaml"
`,
    },
    {
      path: `${o}/state.yaml`,
      content: `# APED state.yaml schema version.
#   v1 — 3.x line: corrections live in a top-level \`corrections:\` array.
#   v2 — 4.1.0+: corrections are split out to docs/state-corrections.yaml
#        (overridable via \`state.corrections_path\` in config.yaml).
#        state.yaml carries the pointer + count mirror.
# validate-state.sh refuses unknown versions; migrate-state.sh runs
# automatically on \`aped-method --update\` to bump v1 → v2.
# Missing schema_version is treated as implicit 1 (backwards compat with
# pre-3.12 scaffolds).
schema_version: 2

# Corrections pointer (4.1.0+, schema v2). Append-only log of artefact
# corrections lives in the file below; \`corrections_count\` is a length
# cache so reader skills don't have to open the corrections file just to
# learn whether anything's been logged. Both fields are maintained by
# \`bash {{APED_DIR}}/scripts/sync-state.sh <<< "append-correction <json>"\`.
corrections_pointer: "docs/state-corrections.yaml"
corrections_count: 0

# APED Pipeline State
# Phases: none → analyze → prd → ux → architecture → sprint
# "sprint" is the final phase — covers story/dev/review cycle
#
# Per-phase tracking (populated by each aped-* skill, additive — none required):
#   pipeline.phases.<phase>.status:               "in-progress" | "done"
#   pipeline.phases.<phase>.output:               path to the produced artefact
#   pipeline.phases.<phase>.started_at:           ISO 8601 when phase began
#   pipeline.phases.<phase>.last_updated:         ISO 8601 of last write
#   pipeline.phases.<phase>.current_subphase:     name of the active sub-step
#   pipeline.phases.<phase>.completed_subphases:  list of finished sub-steps
#
# Per-phase structured fields (Tier 6 — written by the corresponding skill
# at completion; absent fields just mean "skill hasn't recorded that yet"):
#
#   phases.context.{generated, path, type, generated_at, refreshed_at}
#     type ∈ {brownfield, greenfield, hybrid} — derived by aped-context.
#     refreshed_at is set on every re-run; generated_at is set once.
#
#   phases.prd.{status, output, completed_at, fr_count, mode}
#     fr_count is parsed from the FR section of prd.md.
#     mode ∈ {interactive, headless} based on aped-prd invocation.
#
#   phases.architecture.{status, output, completed_at, mode,
#                        councils_dispatched, adrs, watch_items,
#                        residual_gaps, epic_zero_stories}
#     councils_dispatched: list of {id, subject, specialists, verdict}.
#     adrs: list of {id, subject, path, author}.
#     Counts come from architecture.md sections at Phase 5 validation.
#
#   phases.epics.{status, output, completed_at, epic_count, story_count,
#                 fr_coverage, ticket_sync, synced_at}
#     ticket_sync ∈ {synced, skipped, failed}.
#     synced_at is the ISO timestamp of the most recent successful sync.
#
# aped-arch uses the subphase fields to track incremental progress through
# context-analysis → technology-decisions → council-dispatches →
# implementation-patterns → structure-mapping → validation → done.
# Other phases may adopt the same pattern as they grow.
pipeline:
  current_phase: "none"
  phases: {}

# Sprint state (generated by aped-epics, consumed by aped-story / aped-dev / aped-review / aped-sprint)
#
# parallel_limit — max stories dispatched concurrently (each in its own worktree)
# review_limit   — max reviews running concurrently (spec-teams are token-heavy)
# active_epic    — number of the epic currently in sprint (only one at a time)
#
# Per-story status values (ordered): pending → ready-for-dev → in-progress → review-queued → review → done
# Per-story fields:
#   ticket:       external ticket ID (Linear/Jira/GitHub/GitLab), optional
#   worktree:     path to the git worktree hosting this story, set by aped-sprint
#   depends_on:   list of story keys that must be "done" before this one can dispatch
#   started_at:   ISO 8601 timestamp set when status flips to in-progress (null until then)
sprint:
  project: ""
  active_epic: null
  parallel_limit: 3
  review_limit: 2
  stories: {}

# Optional top-level blocks (Tier 6, 3.12.0). Skills populate these as
# needed — they are NOT scaffolded with an empty value to keep greenfield
# state.yaml minimal. validate-state.sh recognises them; unknown blocks
# emit a warn-only stderr message (forward-compat). Re-syncs APPEND;
# never rewrite existing entries.
#
# # Provider-agnostic ticket sync metadata, written by aped-epics
# # Ticket System Setup. Re-syncs append to modified_tickets.
# ticket_sync:
#   provider: "linear"        # linear | github | gitlab | jira
#   sync_id: "<from sync-log>"
#   synced_at: "<ISO>"
#   sync_log: "docs/sync-logs/<file>.json"
#   directive_version: "<optional>"
#   projects: {}              # provider-shape (e.g. Linear: {name, id, lead, target_date})
#   milestones: {}            # epic key → provider milestone id
#   modified_tickets: []      # {id, fields, reason, original_description_sha256, labels_added, project_moved}
#   totals: {}                # api_calls_total, issues_created, etc.
#
# # Tickets explicitly punted to a future scope, written by aped-epics
# # (initial sync) and aped-course (mid-sprint descopes).
# backlog_future_scope:
#   project_id: "<provider project id, optional>"
#   tickets:
#     - { id: "<ticket-id>", category: "<bucket>" }
#
# # Corrections live in \`corrections_pointer\` (top-level above) — schema v2.
# # See docs/state-corrections.yaml for the canonical shape and
# # \`bash {{APED_DIR}}/scripts/sync-state.sh <<< "append-correction <json>"\`
# # for the writer.
`,
    },
    {
      path: `${o}/state-corrections.yaml`,
      content: `# APED state corrections — append-only log of mid-sprint scope changes
# (PRD edits, FR descopes, story descopes, decision amendments, etc.).
# Schema v2 split this out of state.yaml in 4.1.0 to bound the latter's
# growth on long-running projects.
#
# Writer: \`bash {{APED_DIR}}/scripts/sync-state.sh <<< "append-correction <json>"\`.
# The helper validates required keys, appends to the array atomically,
# and updates \`corrections_count\` in state.yaml in the same call.
#
# Required keys per entry:
#   date                ISO 8601 date (YYYY-MM-DD)
#   type                "major" | "minor" | "bug"
#   reason              one-liner — why this correction was made
#   artifacts_updated   list of file paths touched
#   affected_stories    list of story keys impacted
#
# Additional project-specific keys are preserved as-is (forward-compat).
# Reader skills (aped-retro, aped-status) read this file via
# \`corrections_pointer\` in state.yaml; they fall back to top-level
# \`corrections:\` in state.yaml when running against an unmigrated v1 scaffold.
corrections: []
`,
    },
    {
      path: `${a}/templates/product-brief.md`,
      content: `# Product Brief: {{project_name}}

## Executive Summary

<!-- 2-3 sentences: what we're building and why it matters -->

## Core Vision

### Problem Statement

<!-- What specific problem exists today? -->

### Problem Impact

<!-- Who is affected and how? Quantify where possible. -->

### Proposed Solution

<!-- High-level description of the solution approach -->

### Key Differentiators

<!-- What makes this different from existing solutions? -->

## Target Users

### Primary Users

<!-- Who are the main users? Demographics, behaviors, technical level -->

### Secondary Users

<!-- Other stakeholders who interact with the product -->

### User Journey

<!-- Key touchpoints from discovery to daily usage -->

## Success Metrics

### Business Objectives

<!-- What business outcomes define success? -->

### KPIs

<!-- Measurable indicators with targets and timeframes -->

## MVP Scope

### Core Features

<!-- Minimum feature set for first viable release -->

### Out of Scope

<!-- Explicitly excluded from MVP -->

### Success Criteria

<!-- How we know MVP succeeded -->

### Future Vision

<!-- Post-MVP direction and growth areas -->
`,
    },
    {
      path: `${a}/templates/prd.md`,
      content: `# Product Requirements Document — {{project_name}}

**Author:** {{user_name}}
**Date:** {{date}}

## Executive Summary

## Success Criteria

### User Outcomes

### Business Outcomes

### Technical Outcomes

### Measurable Outcomes

## Product Scope

### MVP (Phase 1)

### Growth (Phase 2)

### Vision (Phase 3)

## User Journeys

## Domain Requirements

<!-- Conditional: only if domain-complexity.csv flags high/medium complexity -->

## Functional Requirements

<!-- Format: FR#: [Actor] can [capability] [context/constraint] -->
<!-- Target: 10-80 FRs -->

## Non-Functional Requirements

### Performance

### Security

### Scalability

### Accessibility

### Integration
`,
    },
    {
      path: `${a}/templates/epics.md`,
      content: `# Epics & Stories — {{project_name}}

**Generated:** {{date}}
**Source PRD:** {{prd_path}}

## Requirements Inventory

### Functional Requirements

### Non-Functional Requirements

### Additional Requirements

## FR Coverage Map

<!-- Every FR mapped to exactly one epic. Format: FR# -> Epic N -->

## Epics

### Epic 1: {{epic_title}}

**Goal:** {{user-value-focused goal}}

#### Story 1.1: {{story_title}}

**Depends on:** {{comma-separated story keys, e.g. "1-2, 1-3", or "none"}}

**As a** {{role}}, **I want** {{capability}}, **so that** {{benefit}}.

**Acceptance Criteria:**
- **Given** {{context}}, **When** {{action}}, **Then** {{outcome}}

**Tasks:**
- [ ] {{task description}} [AC: {{ac_ref}}]

**Dev Notes:**
- Architecture: {{relevant patterns}}
- Files: {{files to create/modify}}
- Testing: {{test approach}}
`,
    },
    {
      path: `${a}/templates/story.md`,
      content: `# Story: {{story_key}} — {{story_title}}

**Epic:** {{epic_title}}
**Status:** {{status}}

## User Story

**As a** {{role}}, **I want** {{capability}}, **so that** {{benefit}}.

## Acceptance Criteria

- **Given** {{context}}, **When** {{action}}, **Then** {{outcome}}

## Tasks

- [ ] {{task description}} [AC: {{ac_ref}}]

## Dev Notes

- **Architecture:** {{relevant architecture decisions and patterns}}
- **Files:** {{files to create or modify}}
- **Testing:** {{test approach and framework}}
- **Dependencies:** {{external libs, APIs, services}}

## Dev Agent Record

- **Model:** {{model used}}
- **Started:** {{timestamp}}
- **Completed:** {{timestamp}}

### Debug Log

### Completion Notes

### File List
`,
    },
    {
      path: `${a}/templates/workmux.yaml.example`,
      content: `# Example .workmux.yaml — copy to your repo root if you use workmux
# (https://github.com/raine/workmux) alongside APED. aped-sprint detects
# workmux automatically and will use it to spawn tmux windows with Claude
# Code pre-launched per story.
#
# Docs: https://workmux.raine.dev/

# Pane layout inside each worktree window.
#
# We hardcode \`claude --permission-mode bypassPermissions\` instead of the
# generic \`<agent>\` placeholder for two reasons:
#   1. Parallel sprints launch N worktrees at once; stopping to approve
#      every tool call would defeat the whole point of parallelism.
#   2. The project's \`.claude/settings.local.json\` (copied via files.copy
#      below) already captures the allow/deny rules — bypassPermissions
#      trusts that inventory. Keep that settings file honest.
#
# If you prefer interactive permissions per worktree, swap the command to
# \`claude\` (or \`<agent>\` with \`agent: claude\` in global config).
#
# Alternative — named agent in global config (~/.config/workmux/config.yaml):
#     agents:
#       claude-yolo: "claude --permission-mode bypassPermissions"
# Then here: \`command: <claude-yolo>\` (placeholder syntax). The agents map
# is global-only (no project override), so hardcoding here keeps the project
# self-contained — no user setup required beyond \`workmux setup\` for
# status hooks + companion skills.
#
# Workmux auto-detects built-in agents (claude/gemini/codex/opencode/…) in
# the pane command even with flags, so prompt injection via \`workmux add -p\`
# still works.
panes:
  - command: claude --permission-mode bypassPermissions
    focus: true
  # Uncomment a dev-server pane if you want one automatically:
  # - command: pnpm dev
  #   split: horizontal
  #   size: 30

# Copy these paths into every new worktree.
#
# We copy \`.claude/\` and \`.aped/\` in full on purpose: many APED users
# gitignore them as user-local tooling (the CloudVault setup, for instance,
# ignores both), so a fresh worktree on a feature branch has NEITHER the
# APED skill/hook machinery NOR the Claude settings. Without the copy, the
# worktree's Claude Code session would fail on the very first prompt — the
# UserPromptSubmit hook tries to invoke \`.aped/hooks/guardrail.sh\` and
# misses.
#
# If your project tracks these paths (rare), the copy is a harmless duplicate
# — git's tracked content is already there, workmux copies the same bytes on
# top. No conflict, no divergence concern.
#
# Paths:
#   .env*                       project secrets and per-env configs
#   .mcp.json                   project-scoped Claude Code MCP servers
#                               (Linear, Stripe, etc. — critical for
#                               aped-story ticket fetches and aped-dev)
#   .claude/                    commands, skills, settings (including
#                               settings.local.json for permission sharing)
#   .aped/                      full APED pipeline: skills, hooks, scripts,
#                               templates, config.yaml. Includes hooks/
#                               so guardrail.sh / upstream-lock.sh resolve
#                               in the worktree
#
# Globs are supported. Add more entries if your project has extra files
# (e.g., .vscode/settings.json, credentials, local overrides).
files:
  copy:
    - .env*
    - .mcp.json
    - .claude/
    - .aped/
  # Symlink heavy dirs instead of copying — saves disk and install time.
  symlink:
    - node_modules

# Commands run once per worktree right after creation.
post_create:
  - pnpm install --frozen-lockfile || npm install

# Optional: automatic branch naming via LLM when you run \`workmux add -A\`.
# auto_name:
#   cli: claude
`,
    },
    {
      path: `${a}/templates/quick-spec.md`,
      content: `# Quick Spec: {{title}}

**Date:** {{date}}
**Author:** {{user_name}}
**Type:** {{fix|feature|refactor}}
**Status:** draft | in-progress | done | abandoned

## What

<!-- 1-2 sentences: what needs to change -->

## Why

<!-- 1 sentence: why this change matters now -->

## Acceptance Criteria

- [ ] {{criterion}}

## Files to Change

- {{file_path}} — {{what to change}}

## Test Plan

- {{test description}}

## Result

<!-- Filled after implementation -->
<!-- Files changed, tests added, outcome -->
`,
    },
  ];
}
