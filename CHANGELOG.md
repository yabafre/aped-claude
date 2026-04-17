# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/yabafre/aped-claude/compare/v3.4.1...HEAD
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
