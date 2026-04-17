# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.5.6] - 2026-04-17

### Changed
- **`workmux.yaml.example` copy list now covers the gitignored files APED actually needs.** Previous minimal default (`.env`, `.env.local`) left dispatched worktrees missing the project-scoped MCP config (`/.mcp.json`) and the local Claude settings (`.claude/settings.local.json`), which caused `/aped-story` to fail on Linear ticket fetches and broke any tool/permission customization inherited from main. New defaults:
  - `copy: [.env*, .mcp.json, .claude/settings.local.json]` (glob catches `.env`, `.env.local`, `.env.development`, `.env.production`)
  - `symlink: [node_modules]` (unchanged)
  - `post_create: pnpm install --frozen-lockfile || npm install` (unchanged)
- **Template comments explain the tracked-vs-gitignored distinction.** Users were tempted to list `.aped/` and `.claude/` in `files.copy` to "make it work" — those come in automatically via the git worktree because they're committed on the branch. Listing tracked paths is redundant and can conflict with branch divergence.
- `/aped-sprint` SKILL now describes the template accurately (MCP + settings.local.json callout) so the skill and template stay in sync.

## [3.5.5] - 2026-04-17

### Fixed
- **Recovery Path A in `/aped-sprint` no longer uses `workmux send` to launch claude.** Live test confirmed `workmux send` only talks to an already-running agent — it cannot launch one. `workmux run` also isn't right (it captures output as artifacts, blocks by default, not interactive). The canonical way to (re)start the configured agent pane in an existing worktree is a close+open cycle, because `workmux open` only executes pane `command:` entries when **creating** a window; on an existing window it just switches to it.
  - New recovery sequence: \`workmux close "$NAME" 2>/dev/null || true; workmux open "$NAME" --run-hooks --force-files\`.
  - SKILL explicitly documents why `send` and `run` don't work so the rationale survives future edits.

### Added
- **`workmux setup` recommendation.** The AGENT column in `workmux list` stays `-` unless the plugin hooks are installed into Claude Code's settings (via `workmux setup`). SKILL now tells the user once to run `workmux setup` in the main project to enable agent status tracking — optional but makes `workmux list` / `workmux dashboard` actually informative.
- Verification step after recovery open: `workmux capture "$NAME" | tail -5` should show the claude banner; if it shows a bare shell, the `.workmux.yaml` lacks an `<agent>` pane or the command didn't take — fallback to the user typing `claude` manually.

## [3.5.4] - 2026-04-17

### Fixed
- **`/aped-sprint` WezTerm PATH fix is now applied, not just mentioned.** When \`wezterm\` is missing from \`$PATH\` but \`$WEZTERM_EXECUTABLE_DIR\` is set, the skill now runs \`export PATH="$WEZTERM_EXECUTABLE_DIR:$PATH"\` in its own shell before any workmux call — otherwise \`workmux open\` / \`add\` fail with \`wezterm cli list: No such file or directory\`. The user is still told once to persist it in \`~/.zshrc\`.
- **Recovery Path A documents the agent-binding gap.** \`workmux open\` (used when a worktree already exists or \`workmux add\` drifts) does NOT bind an agent — the \`-a\` flag only exists on \`workmux add\`. The skill now instructs \`workmux send <name> "claude"\` after \`workmux open\`, and falls back to asking the user to type \`claude\` manually if \`workmux list\` still shows \`AGENT=-\`. The "User Instructions" section surfaces this to the user when the recovery path was used.

## [3.5.3] - 2026-04-17

### Changed
- **Branch-per-story contract enforced across `/aped-sprint`, `/aped-story`, `/aped-lead`.** The live test of 3.5.x surfaced a workflow bug: `/aped-sprint` was posting `story-ready` check-ins and flipping `sprint.stories.{key}.status` to `in-progress` **before** any story file existed, then `/aped-lead` escalated all three because the files were missing. Users were pushed toward running `/aped-story` in `main` (violating branch-per-story) as the recovery path.
  - `/aped-sprint` now creates worktrees only. It records the `worktree` path in state.yaml but no longer touches `status`/`started_at` and no longer posts `story-ready`. Explicit "NEVER" rules added up top.
  - `/aped-story` gains a mode detector (`${a}/WORKTREE` marker) and a **worktree mode**: commits the story file on the feature branch, then posts `story-ready` itself. Solo mode behavior unchanged. Refuses to run on `main` when the marker is present.
  - `/aped-lead`'s `story-ready` AUTO criterion reads the story file from `sprint.stories.{key}.worktree` (the feature branch), not from `main`. Also checks that the story file has at least one commit on the feature branch before auto-approving.
  - `/aped-sprint` "Next Step" rewritten: the user runs `/aped-story <key>` in each worktree first, **then** `/aped-lead` in main.
- **workmux syntax corrected.** The prior SKILL used `workmux add --branch …` — that flag was removed in workmux 0.1.x. Now uses positional `workmux add <BRANCH_NAME> -a claude`, with a documented fallback to `sprint-dispatch.sh` + `workmux open <worktree-name>` when `workmux add` rejects the invocation.
- **workmux + WezTerm CLI detection hardened.** `/aped-sprint` Setup now also probes for a multiplexer (tmux **or** wezterm) and, if the wezterm CLI is missing from `$PATH` but `$WEZTERM_EXECUTABLE_DIR` is set, exports it for the current shell before dispatching (workmux shells out to `wezterm cli`). Mentioned to the user so they can persist it in `~/.zshrc`.
- **`.workmux.yaml` bootstrap rule.** `/aped-sprint` now explicitly copies from `${a}/templates/workmux.yaml.example` when the config is missing, instead of writing a stripped-down inline version. The template already includes `.env` copy, `node_modules` symlink, and `pnpm install --frozen-lockfile` post_create.

### Fixed
- Recovery option A in the sprint flow was "run `/aped-story` in main then rebase into worktrees" — this is now explicitly called out as wrong in the skill instructions. The canonical recovery is: in each worktree, run `/aped-story <key>` on the feature branch, commit, let the skill post `story-ready`.

## [3.5.2] - 2026-04-17

### Changed
- **`/aped-review` reverts to plain subagents** — no more `TeamCreate` / `team_name` / `SendMessage` for the review specialists. Review is a set of independent validations; the Lead merges findings and cross-references domains manually (human-in-the-loop relay, not real-time negotiation). The agent-team machinery was too heavy for this use case and triggered Claude Code's experimental tmux-pane rendering, which becomes unreadable beyond ~3 agents.
- Removes the batching rules introduced in `3.5.1` — no parallelism cap is needed for subagents. All selected specialists (Eva + Marcus + Rex + conditionals by file surface) are dispatched in a single message.
- Step 8 (Apply Fixes): Lead either applies simple fixes directly or re-dispatches the relevant specialist as a one-shot subagent for cross-domain sanity checks — no `SendMessage` ACK loops.
- Step 13: no `TeamDelete` needed (no team exists).

### Kept
- `/aped-dev` fullstack team mode (Kenji / Amelia / Leo) — unchanged. Still uses `TeamCreate` + `SendMessage` because the three agents genuinely co-edit a shared API contract (Kenji is the owner, Amelia and Leo negotiate changes). That's where a team earns its complexity.

## [3.5.1] - 2026-04-17

### Fixed
- **`/aped-review` parallelism cap** — specialists are now dispatched in batches of at most 3 in parallel. Claude Code's experimental agent-teams renders each teammate in a separate tmux pane; a 2×2+ grid on a standard terminal produced unreadable 40-column panes where the `claude --agent-id …` bootstrap command wrapped 7–8 lines deep. The team (`TeamCreate` + `SendMessage`) stays fully functional — we just avoid over-saturating tmux.
  - Batch 1: Eva (ac-validator) + Marcus (code-quality) + one conditional specialist picked by the story's primary surface (Diego / Lucas / Kai / Sam).
  - Batch 2: Rex (git-auditor) + additional conditionals (Aria, cross-layer specialists) if the story spans extra layers. Batch 2 receives batch-1 findings in its initial prompt — richer context, better cross-referencing.
  - Team persists across batches; `SendMessage` works between batch-1 and batch-2 teammates.

## [3.5.0] - 2026-04-17

### Added
- **Lead Dev coordination layer** — new `/aped-lead` skill turns `/aped-sprint` from "N isolated worktrees" into a coordinated team. Story Leaders post `story-ready` / `dev-done` / `review-done` check-ins at every transition; the Lead batch-processes them from the main project, auto-approving what's safe on hard programmatic criteria (deps resolved, tests passing 100%, no HALT logs, git clean, no blocking labels) and escalating anything borderline to the user. Approvals `tmux send-keys` the next command into the right worktree window (fallback: print the command for manual invocation).
- **`checkin.sh` helper** at `.aped/scripts/` with six sub-commands (`post`, `poll`, `approve`, `block`, `status`, `push`). Backend routes to ticket-system labels + comments when `ticket_system != none`, falls back to JSONL inboxes under `.aped/checkins/` otherwise (both concurrent-safe via a portable `mkdir`-based lock — works on macOS where `flock` is absent).
- **`/aped-dev` in worktree mode** now posts `dev-done` and HALTs awaiting Lead approval — zero auto-chain preserved across session boundaries.
- **`/aped-review` in worktree mode** posts `review-done` only when the story flips to `done` — otherwise stays silent for the user to re-run.
- **`/aped-status`** new section "Check-ins awaiting Lead Dev approval" surfaces pending transitions and suggests `/aped-lead`.
- **`/aped-sprint`** now posts `story-ready` at dispatch and does NOT pre-inject `/aped-dev` via workmux `-p` — the Story Leader sits idle until the Lead pushes it.
- **Optional workmux integration** for `/aped-sprint` — when [workmux](https://github.com/raine/workmux) is detected in `$PATH`, APED delegates worktree + tmux window creation + Claude Code launch to `workmux add -a claude` (no `-p` — the Lead pushes `/aped-dev` via `tmux send-keys` once the story-ready check-in is approved). Users gain auto-launched tmux windows, live agent dashboard (`workmux dashboard`), and one-command cleanup (`workmux merge`). Without workmux, the existing fallback flow is preserved — zero breaking change.
- Sample `.workmux.yaml` shipped at `.aped/templates/workmux.yaml.example` with APED-friendly defaults (Claude agent in focus, `.env` copy, `node_modules` symlink, `pnpm install` post-create).
- `/aped-status` now probes `workmux` at startup; if present, the header surfaces "Live agents: `workmux dashboard`" as the authoritative live view.
- README: "Recommended companion tools" section listing workmux (and `jq` for guardrail performance).
- **Parallel sprint** — new `/aped-sprint` skill dispatches multiple stories at once via `git worktree`, one Claude Code session per story. Respects `parallel_limit` (default 3) and `review_limit` (default 2) from `state.yaml`, resolves a DAG from `depends_on:` on each story, and never auto-launches sessions (zero auto-chain preserved — prints the exact commands the user runs).
- **Upstream lock PreToolUse hook** (`.aped/hooks/upstream-lock.sh`) — denies `Write`/`Edit`/`NotebookEdit` on `prd.md`, `architecture.md`, `ux/`, `product-brief.md` while any story is `in-progress`. Only `/aped-course` can unlock by setting `sprint.scope_change_active: true`.
- **Sprint helper scripts** under `.aped/scripts/`:
  - `sprint-dispatch.sh` — creates worktree at `../{project}-{ticket}` with branch `feature/{ticket}-{story-key}` and a `.aped/WORKTREE` marker file
  - `worktree-cleanup.sh` — removes a worktree (force-capable) and optionally deletes the branch
  - `sync-state.sh` — atomic `state.yaml` mutations behind a `flock`
- **Worktree mode** in `/aped-dev` and `/aped-review` — detects the `.aped/WORKTREE` marker and pins the session to the story it records; reads the canonical `state.yaml` from the main project root.
- **Review queue** — `/aped-review` now checks `review_limit` first; if full, the story is parked as `review-queued` and the user is told to re-run when capacity frees.
- **Multi-worktree dashboard** — `/aped-status` refonte: sprint header (capacity used/limit), live list of active worktrees (branch, last commit, test status, ticket status), review queue, ready-to-dispatch list (DAG resolved), ticket sync check. Classic-mode fallback preserved.
- **Scope-change coordination** — `/aped-course` now lists active worktrees, posts notification ticket comments, sets `scope_change_active: true` before touching upstream docs, invalidates epic-context caches on completion, and clears the flag.
- `depends_on` field on each story in `state.yaml` and `**Depends on:**` notation in `epics.md` template — required for DAG resolution in `/aped-sprint`.
- `state.yaml` schema extended: `sprint.active_epic`, `sprint.parallel_limit`, `sprint.review_limit`, per-story `worktree`, `depends_on`, `started_at`. New status `review-queued`.

## [3.4.4] - 2026-04-17

### Added
- `/aped-dev` fullstack mode now calls `TeamDelete(name: "dev-{story-key}")` when the Lead finalises, freeing teammate threads early instead of leaking them until session end.
- `/aped-review` Step 13 renamed to "Tear Down + Next Step" and now calls `TeamDelete(name: "review-{story-key}")` unconditionally before returning to the user.
- Team coordination rule in `/aped-review` now documents `TaskList` + `TaskUpdate` (claim pattern with `owner`) so teammates can self-serve pending work instead of waiting for Lead dispatch.

## [3.4.3] - 2026-04-17

### Added
- `permissions.allow` block in scaffolded `.claude/settings.local.json` — pre-approves the Bash invocations APED skills need (`git`, `gh`, `glab`, `npm`, `pnpm`, `pnpx`, `npx`, `node`, `bash`, `python3`) so users are not prompted on every run.
- `timeout: 5` on the `UserPromptSubmit` hook entry so the guardrail is killed quickly on stall instead of hitting Claude Code's 600s default.
- `argument-hint` frontmatter on slash commands and skills that take an argument (`/aped-story`, `/aped-dev`, `/aped-review`, `/aped-qa`, `/aped-quick`, `/aped-course`) — surfaces autocomplete hints in the Claude Code UI.
- `allowed-tools` on `/aped-checkpoint` (read-only analysis) aligning with the existing `/aped-status` convention.

### Changed
- `${CLAUDE_PROJECT_DIR}` is now used consistently (with braces) in scaffolded `settings.local.json` and in every slash command body, replacing the non-standard `$PROJECT_ROOT` variable. Brings APED in line with Claude Code's official variable-substitution docs.
- `src/templates/commands.js` refactored to a declarative `COMMAND_DEFS` table + single `renderFrontmatter()` generator — removes 14 copies of the same boilerplate.

## [3.4.2] - 2026-04-17

### Fixed
- `publishConfig.provenance` removed — npm requires a recognised CI provider (GitHub Actions, GitLab CI) for automatic provenance, which blocked local publishes. Provenance can still be enabled per-publish from CI with `npm publish --provenance`.
- `bin/aped-method` path normalised (no leading `./`) to silence `npm publish` warning.

### Note
- Version `3.4.1` was tagged on GitHub but never published to npm because of the provenance issue above. `3.4.2` contains the same code plus this fix.

## [3.4.1] - 2026-04-17

### Added
- `--help` / `-h` flag with full usage documentation.
- `--debug` flag and `DEBUG=1` env var for stack traces.
- Automatic tar.gz backup before `--fresh` (written to `.aped-backups/`).
- Second explicit confirmation in interactive `--fresh` mode, listing what will be deleted.
- `NO_COLOR` / `FORCE_COLOR` support (via picocolors).
- `exports` map, `sideEffects: false`, `homepage`, `bugs`, `publishConfig` in `package.json`.
- `smoke` / `check` / `prepublishOnly` npm scripts.
- GitHub Actions workflows: `ci.yml` (check + smoke + real scaffold on Node 18/20/22) and `release.yml` (manual release builder).
- `LICENSE` and `CHANGELOG.md` files.

### Changed
- `config.yaml` parser now uses a whitelist of accepted keys and rejects absolute paths or `..` segments.
- CLI flag parser now warns on unknown flags instead of silently accepting them.
- `guardrail.sh` now uses `set -u` / `set -o pipefail`, validates `current_phase` against a whitelist, and prefers `jq` → `node` for JSON encoding (no more regex fallback).
- Exit codes are now meaningful: `0` success, `1` user error, `2` internal error, `130` user cancellation.
- `/aped-review` Aria (visual specialist): clarified ownership — dev owns React Grab at each GREEN, Aria validates rather than re-running from scratch.
- `/aped-review` Step 8: Lead direct-fix must now `SendMessage` an ACK to the specialist who raised the finding, preventing silent patches that bypass the team.
- `/aped-dev`: explicit fallback documented for when React Grab MCP is unavailable (warn + defer to review, never block dev).
- `files` field in `package.json` restricted to publishable assets, excluding auto-generated `CLAUDE.md` artefacts and the legacy `bin/create-aped.js` alias.

### Security
- Removed regex-based JSON escaping in `guardrail.sh` that could have allowed context injection via a crafted `state.yaml`.
- Path traversal protection on `aped_path`, `output_path`, and `--commands`/`--output`/`--aped` CLI flags (reject `..` segments and absolute paths).
- Whitelisted CLI flags, ticket systems, and git providers to reject unknown or malicious values early.

## [3.4.0] - 2026-04-17

### Added
- Agent-team orchestration for `/aped-review` with a Lead and specialist teammates that coordinate via `SendMessage`.
- Specialist personas: Eva (AC validator), Marcus (code quality), Rex (git auditor), Diego (backend), Lucas (frontend), Aria (visual), Kai (infra), Sam (fullstack).
- Optional fullstack team mode for `/aped-dev` (Kenji / Amelia / Leo) for stories spanning multiple layers.
- Research personas in `/aped-analyze`: Mary (market), Derek (domain), Tom (technical).

### Changed
- `/aped-review` status transitions are strictly binary: `review → done` or `review → review` (no intermediate states, no `[AI-Review]` items).
- Review skill now requires explicit user validation before any status change or write.

## [3.3.1] - 2026-04-16

### Fixed
- `guardrail.sh` now introduces an explicit `sprint` phase and simplifies phase-skip checks.
- Story-status fallback: if `current_phase` isn't updated, the guardrail still detects active sprint work from story statuses.

## [3.3.0] - 2026-04-16

### Added
- End-to-end ticket-system integration across `/aped-epics`, `/aped-story`, `/aped-dev`, `/aped-review`. Supports Linear, Jira, GitHub Issues, GitLab Issues.
- Ticket fetched as source of truth at the start of each phase; divergence with local story halts the flow.

## [3.2.1] - 2026-04-16

### Changed
- Version realigned to 3.2.1 after a premature 3.4.0 tag was rolled back. No functional changes.

## [3.2.0] - 2026-04-12

### Changed
- `CLAUDE.md` generation is now handled by the dedicated `/aped-claude` skill instead of static scaffolding.

## [3.1.0] - 2026-04-12

### Added
- `/aped-dev` integrates `react-grab-mcp` for live visual verification at each GREEN step of the TDD loop on frontend files.

## [3.0.2] - 2026-04-12

### Added
- `react-grab-mcp` integration for visual review (first use in `/aped-review`).

## [3.0.1] - 2026-04-12

### Fixed
- Removed `readStdinLines` that was consuming stdin and blocking `@clack/prompts` interactive prompts.

## [3.0.0] - 2026-04-12

### Added
- Complete pipeline overhaul with user-driven flow (`Analyze → PRD → UX → Arch → Epics → Story → Dev → Review`).
- Migration to `@clack/prompts` with animated logo, pipeline diagram, and responsive terminal output.
- Guardrail hook now emits the official Claude Code UserPromptSubmit JSON shape and honours `$CLAUDE_PROJECT_DIR`.

### Changed
- Zero auto-chaining between phases: every skill ends on "Run `/aped-X` when ready" — the user controls the pace.

[Unreleased]: https://github.com/yabafre/aped-claude/compare/v3.5.2...HEAD
[3.5.2]: https://github.com/yabafre/aped-claude/compare/v3.5.1...v3.5.2
[3.5.1]: https://github.com/yabafre/aped-claude/compare/v3.5.0...v3.5.1
[3.5.0]: https://github.com/yabafre/aped-claude/compare/v3.4.4...v3.5.0
[3.4.4]: https://github.com/yabafre/aped-claude/compare/v3.4.3...v3.4.4
[3.4.3]: https://github.com/yabafre/aped-claude/compare/v3.4.2...v3.4.3
[3.4.2]: https://github.com/yabafre/aped-claude/compare/v3.4.1...v3.4.2
[3.4.1]: https://github.com/yabafre/aped-claude/compare/v3.4.0...v3.4.1
[3.4.0]: https://github.com/yabafre/aped-claude/compare/v3.3.1...v3.4.0
[3.3.1]: https://github.com/yabafre/aped-claude/compare/v3.3.0...v3.3.1
[3.3.0]: https://github.com/yabafre/aped-claude/compare/v3.2.1...v3.3.0
[3.2.1]: https://github.com/yabafre/aped-claude/compare/v3.2.0...v3.2.1
[3.2.0]: https://github.com/yabafre/aped-claude/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/yabafre/aped-claude/compare/v3.0.2...v3.1.0
[3.0.2]: https://github.com/yabafre/aped-claude/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/yabafre/aped-claude/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/yabafre/aped-claude/releases/tag/v3.0.0
