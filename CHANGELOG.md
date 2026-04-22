# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.7.5] - 2026-04-22

### Fixed
- **Duplicate slash commands in Claude Code** (3×–4× listings of every `/aped-*`). Previous versions unconditionally symlinked every skill into four discovery paths — `.claude/skills/`, `.opencode/skills/`, `.agents/skills/`, and `.codex/skills/` — on the assumption that Claude Code only scans `.claude/skills/`. That assumption was wrong: Claude Code discovers skills from `.claude/skills/` **and** from the cross-tool directories when they exist, and it also auto-registers the skill `name:` frontmatter as a slash on top of the explicit `.claude/commands/aped-*.md` entry. The combination produced 4× the registrations.

### Changed
- **`.claude/skills/` is no longer a default symlink target.** Claude Code reaches APED slash commands via `.claude/commands/aped-*.md` — symlinking into `.claude/skills/` was redundant and caused duplicates.
- **Cross-tool symlinks are now auto-detected.** The scaffolder now only creates symlinks under `.opencode/skills/`, `.agents/skills/`, and `.codex/skills/` when the corresponding `.opencode` / `.agents` / `.codex` marker directory exists in the project. A fresh single-tool Claude Code project gets zero skill symlinks, and zero duplication. Users with multi-tool setups get symlinks only where they make sense.
- **`--fresh` cleanup now uses `TARGET_CATALOG`** — the historical superset of every skill-symlink location APED has ever written to — so legacy `.claude/skills/aped-*` links from pre-3.7.5 installs get removed on a fresh reinstall.
- **`aped-method doctor`** aligns with the new behavior: symlink health is checked against whatever targets auto-detect resolves to, and reports `no cross-tool symlinks expected (single-tool install)` instead of "0/0/0/0" when nothing is expected.

### Migration notes for existing installs
If you are upgrading from 3.7.x with visible duplicates in Claude Code's slash menu, clean up the legacy `.claude/skills/aped-*` symlinks once and restart Claude Code:

```bash
rm -rf .claude/skills/aped-*
```

Nothing else is needed — the scaffolded `.claude/commands/aped-*.md` files continue to register the slash commands correctly. If you use OpenCode / Codex / agents.md-aware tools, keep the marker directories (`.opencode/` etc.) in your project root; auto-detect will recreate the relevant symlinks the next time you run `aped-method --update` or `aped-method symlink`.

## [3.7.4] - 2026-04-22

### Changed
- **`engines.node` bumped from `>=18` to `>=20`.** `@clack/core@1.2` — the transitive dep behind `@clack/prompts` — imports `styleText` from `node:util`, which only exists in Node 20+. Node 18 CLI startup fails with `SyntaxError: The requested module 'node:util' does not provide an export named 'styleText'`. Node 18 has been EOL since 2025-04 so the practical impact is small; users still on 18 should upgrade to 20 LTS or 22.
- **CI matrix narrowed to `[20, 22]`.** The Node 18 slot only ever "passed" because nothing in our own code broke on it — the CLI fails at the first `import` of `@clack/prompts`, which the existing smoke covers now that `smoke:pack` was added in 3.7.3.

### Why
3.7.3 added `smoke:pack` and re-ran CI for the first time on the refreshed workflow file. CI surfaced that Node 18 has been silently broken for a while because its job only ran `--version` / `--help` against the local checkout, which behaved differently from a real installed package. The fix is to acknowledge the reality instead of papering over it.

## [3.7.3] - 2026-04-22

### Fixed
- **Hotfix for `npx aped-method@3.7.2` ERR_MODULE_NOT_FOUND.** The `files` allowlist in 3.7.2 listed every new module from the subcommand split except `src/subcommands.js`, so the published tarball was missing that file and exploded on first `import` from `src/index.js`. 3.7.3 re-adds `src/subcommands.js` to the allowlist. All 3.7.2 users should upgrade.

### Added
- **`smoke:pack` safety net.** `npm run smoke` now also builds the tarball via `npm pack`, extracts it, symlinks the current `node_modules`, and runs `--version` / `--help` / `doctor` from the extracted tree — exactly the flow `npx` triggers. This would have caught the 3.7.2 regression before publish. Included in `prepublishOnly`.

## [3.7.2] - 2026-04-22

### Added
- **`aped-method doctor`** — verifies an installation (required files, hook executability, slash command count, installed skill dirs, symlink health, `settings.local.json` validity, optional binaries `jq`/`gh`/`workmux`). Exits non-zero only on required failures.
- **`aped-method statusline`** — installs an APED-aware Claude Code status line that renders `current_phase`, active epic, active story, review queue count, worktree count, and git branch from `docs/aped/state.yaml`. Prompts before overwriting a pre-existing non-APED `statusLine` (bypass with `--yes`).
- **`aped-method safe-bash`** — optional `PreToolUse` hook that intercepts obviously destructive shell commands (`rm -rf /`, `rm -rf $HOME`, `rm -rf ~`, `rm -rf /*`, `curl|bash` / `wget|sh` / `curl|zsh`, `dd`/`mkfs`/`fdisk` with trailing arg, `chmod -R 777`) and asks before `sudo`. **Explicitly labelled as a best-effort UX safety net, not a security boundary** (`SECURITY.md` documents the bypass surface).
- **`aped-method symlink`** — inspects and repairs cross-tool skill symlinks (`.claude/skills`, `.opencode/skills`, `.agents/skills`, `.codex/skills`). Recreates missing/broken APED links without touching real directories.
- **`aped-method post-edit-typescript`** — optional `PostToolUse` hook for `Write|Edit|MultiEdit` that runs local `prettier --write` and `eslint --fix` on `.ts`/`.tsx`/`.mts`/`.cts` files when the binaries are already installed. Silent no-op otherwise.
- **`docs/COMMANDS.md`** — generated command catalog. `npm run generate:catalog` rebuilds it from `COMMAND_DEFS`; CI enforces no drift via `git diff --exit-code`.
- **`commands_path` persisted in `config.yaml`** — survives `--update`, read back by `detectExisting`.
- **Scaffold e2e coverage extended** — 12 phases (was 8). New phases: `doctor` pass, symlink repair of a broken link, optional subcommand install (`statusline`/`safe-bash`/`post-edit-typescript`), doctor re-pass after optional installs.
- **Unit tests up to 63** — bash-safety bypass documentation (`eval`, base64, hex), symlink manager inspect/repair, doctor healthiness snapshot, parse-args / detect-existing / merge-settings additions.

### Changed
- **Opt-in hook scripts extracted to disk** — `src/templates/hooks/safe-bash.js`, `src/templates/hooks/post-edit-typescript.js`, and `src/templates/scripts/statusline.js` now live as standalone files with `{{APED_DIR}}` / `{{OUTPUT_DIR}}` placeholders (same pattern as skills in 3.7.1). `src/templates/optional-features.js` becomes a small loader — reviewable diffs, syntax highlighting, and `node --check` on every template.
- **`mergeSettings` now unions `permissions.allow`** — existing entries are preserved and deduplicated against incoming ones instead of being replaced.
- **Subcommand handlers extracted to `src/subcommands.js`** — 243 lines moved out of `src/index.js` (1048 → 846). Circular helper import (`DEFAULTS`, `CLI_VERSION`, `validateSafePath`, `UserError`, `mergeSettings`, `detectExisting`) is safe: all consumed only inside function bodies.
- **`package.json` `files` allowlist is now explicit** — replaced the `src/*.js` glob with the five named source files. Prevents accidental publication of future internal helpers.
- **`npm run check` covers the new template subdirectories** — `src/templates/hooks/*.js` and `src/templates/scripts/*.js` are now syntax-checked on every CI run.

### Notes
- This is the first release that actually uses `npm publish --provenance` — `NPM_TOKEN` is now configured in the release workflow.
- No change to the primary scaffolder contract. Existing installations upgrade via `--update` without migration. All new subcommands are opt-in; nothing runs unless installed.

## [3.7.1] - 2026-04-22

### Added
- **Security policy.** Added `SECURITY.md` with the disclosure policy, supported versions, hardening notes, and the current dev-only `esbuild` advisory context.
- **Troubleshooting guide.** Added `docs/TROUBLESHOOTING.md` covering the most common install, upgrade, hook, symlink, and color-output problems.
- **Automated test coverage.** Added 41 unit tests for argument parsing, path validation, semver comparison, settings merge behavior, and existing-install detection.
- **Scaffold end-to-end CI.** Added `.github/scripts/scaffold-e2e.sh` and wired it into CI, including a dedicated macOS scaffold job.

### Changed
- **Skill templates now live as Markdown files.** Extracted the scaffolded APED skills into `src/templates/skills/*.md` and replaced the giant inline JS blob with a small loader module.
- **Release workflow supports npm provenance.** The manual release workflow now publishes with `npm publish --provenance --access public` when `NPM_TOKEN` is configured, and otherwise skips publish cleanly.
- **Prepublish now runs tests.** `prepublishOnly` now runs syntax checks, smoke tests, and the Vitest suite before publish.
- **Package contents updated.** The npm package now explicitly includes the extracted skill templates and `SECURITY.md`.

## [3.7.0] - 2026-04-22

### Added
- **`/aped-brainstorm` — divergent ideation.** New upstream skill for generating 100+ ideas before convergence. Anti-bias protocol (shift domain every 10 ideas), quota enforcement (50 minimum, 100 target), 10-technique library (SCAMPER, What If, Pre-mortem, Reverse Engineering, First Principles, etc.). Output at `${outputDir}/brainstorm/session-{date}.md`. Does not update `state.yaml` — it's a creative tool usable at any time.
- **`/aped-prfaq` — Working Backwards challenge.** Amazon-style press-release-first discipline in 5 stages: Ignition → Press Release → Customer FAQ → Internal FAQ → Verdict. Parallel research subagents (artifact scanner + web researcher). Concept-type detection (commercial / internal / open-source / community) adapts FAQ framing. Verdict includes a PRD Distillate ready to seed `/aped-analyze`. `--headless` flag for autonomous first-draft mode.
- **`/aped-retro` — post-epic retrospective.** Systemic post-mortem with 3 parallel specialists (Mia Struggle Analyzer, Leo Velocity Analyzer, Ava Previous-Retro Auditor). Detects significant discoveries that trigger `/aped-course`, enforces SMART action items with owners, produces a readiness assessment for the next epic. Persists lessons to `${outputDir}/lessons.md` for cross-epic continuity.
- **`/aped-elicit` — horizontal critique toolkit.** 19 methods across 9 categories (core, risk, competitive, advanced, creative, research, retrospective, philosophical, learning). Invokable standalone or from inside any APED skill mid-workflow. Iterative loop with y/n-per-method consent. Smart menu selection based on target type (architectural, product, technical, etc.).

### Changed
- **`/aped-arch` — Architecture Council (Phase 2b).** For high-stakes decisions (DB, auth, API, frontend, infra), dispatches 3-4 specialist subagents in parallel: Winston (systems), Lena (pragmatic), Raj (security/compliance), Nina (cost/ops), Maya (edge cases). Each runs independently for genuine divergent perspectives. User picks final option, minority view is documented as signal for future pivots. Escape hatch for MVP-scale decisions.
- **Cross-tool skill distribution via symlinks.** On macOS/Linux the scaffolder now creates relative symlinks in `.claude/skills/`, `.opencode/skills/`, `.agents/skills/`, and `.codex/skills/` that point back to the canonical `${apedDir}/aped-*` directories. One edit in `.aped/` propagates to every tool — no manual sync, no drift. Claude Code still uses the real files under `${commandsDir}/aped-*.md` for slash command registration. Windows hosts are auto-skipped (symlinks require developer mode + `core.symlinks=true`). Fresh mode cleans stale `aped-*` entries in all four target directories before rebuilding.

### Why
Ideation and critique tooling was missing upstream of `/aped-analyze` and orthogonally across all phases. `/aped-brainstorm` and `/aped-prfaq` fill the "idea is still fuzzy" gap before committing to a PRD. `/aped-elicit` gives every phase access to structured critique methods without forcing them into the pipeline linearly. Post-epic review was ad-hoc — `/aped-retro` turns it into a repeatable discipline with specialist parallelism and continuity enforcement. Single-brain architecture decisions converge to groupthink — the Architecture Council surfaces genuine disagreement on decisions that cost weeks to reverse. Cross-tool distribution via symlinks replaces the "copy & hope" pattern with a single source of truth that every tool (Claude Code, OpenCode, Codex, agents.md readers) sees instantly.

## [3.6.0] - 2026-04-18

### Added
- **`/aped-ship` — end-of-sprint merge + pre-push composite review.** New skill that closes the loop on parallel sprints. Detects all `status: done` stories with unmerged feature branches, proposes a conflict-minimizing merge order (smaller diff first), executes the batch with `--ours` on `state.yaml` conflicts (main is authoritative — `/aped-lead` already flipped statuses there) and HALT on any other conflict, then runs a composite pre-push review on `origin/main..main`:
  - secret / credential scan (with noise filtering for type declarations, redact list keys, `.env.example` placeholders)
  - debug / TODO / FIXME scan
  - typecheck (detects `scripts.typecheck` or falls back to `tsc --noEmit`)
  - lint (if `scripts.lint` exists)
  - `db:generate` for Prisma projects (surfaces env-var coalesce bugs as BLOCKERS)
  - state.yaml consistency (merged stories have `status: done` + `worktree: null`)
  - leftover worktrees / unmerged branches
  - Findings triaged into BLOCKER / WARNING / INFO. GATE before push — skill PRINTS `git push origin main` but never executes it.

### Changed
- **`/aped-lead` no longer pushes `/merge` on `review-done` approvals.** Per-story merges from parallel worktrees race on main's state.yaml and produce avoidable conflicts. Instead, on `review-done` approval the Lead flips `sprint.stories.{key}.status` to `done` in main's state.yaml and stops. The feature branch and worktree stay live until `/aped-ship` batches the teardown. This is a contract change — existing `/aped-lead` flows will now surface an "X stories ready to ship — run `/aped-ship`" prompt instead of merging per-story.
- **`/aped-lead` dispatch follow-up** now surfaces both dimensions: free parallel-sprint slots AND done-but-unmerged ship candidates.
- **`/aped-lead` Next Step** recommends `/aped-ship` when there are done stories ready to merge.

### Why
Live testing of the parallel-sprint flow in CloudVault revealed two structural gaps:
1. No orchestrator for end-of-sprint batch merge. Users had to manually determine merge order, resolve state.yaml conflicts, and clean up worktree paths — exactly the kind of repetitive work a skill should automate.
2. No pre-push review on the composite main. Individual stories passed `/aped-review`, but the composite (after merges) could have typecheck errors, missing `db:generate`, or accidental secret exposure that no per-story review catches. The push step had no gate.

Together these two gaps meant the user had to ad-hoc-review before push every sprint. `/aped-ship` gives that workflow a home.

### Migration notes
- Existing `/aped-lead` flows using per-story `/merge` no longer receive that push. Run `/aped-ship` after `/aped-lead` to complete the merge + review phase.
- No file format changes — state.yaml schema is unchanged.
- Minor bump because this is additive (new skill + behavior shift on `/aped-lead` review-done) with no removed commands or renamed fields.

## [3.5.9] - 2026-04-18

### Added
- **`/aped-lead` sends `/clear` before each follow-up command.** Phase transitions (story → dev → review → merge) now reset the Story Leader's conversation context via Claude Code's built-in `/clear`, preventing cross-phase hallucinations (e.g., `/aped-dev` re-litigating scope from `/aped-story`, or `/aped-review` being anchored by `/aped-dev`'s rationale). Applied to all three push paths (`workmux send`, `checkin.sh push`, and the manual fallback instruction).
- **`/aped-sprint` detects tmux session state.** When `$TMUX` is empty, workmux auto-picks WezTerm native tabs as backend, which means `workmux sidebar` and the tmux-based `workmux dashboard` pane can't see the dispatched agents. SKILL now warns the user once and suggests `tmux new-session -As aped` → `claude --permission-mode bypassPermissions` → `/aped-sprint` if they want live status. Dispatch still works in the WezTerm-only path.
- **`/aped-sprint` checks for `workmux setup`.** If `~/.claude/skills/workmux` is missing, SKILL tells the user once: "Run `workmux setup` (one-time, user-level) to enable agent-status icons and install the `/merge` skill the Lead delegates to." Non-blocking — APED falls back to `worktree-cleanup.sh` if `/merge` is absent.
- **Template documents the `agents:` global alternative.** Users who want to centralize the claude flags across all workmux projects can define `agents: { claude-yolo: "claude --permission-mode bypassPermissions" }` in `~/.config/workmux/config.yaml` and reference it via `command: <claude-yolo>`. The project template keeps the hardcoded pane command for self-containment.

### Why these came in
Live testing surfaced (1) no way to see live worktree status because workmux was running WezTerm-backend (no tmux wrapping), and (2) the Story Leader's context would carry over between /aped-story → /aped-dev → /aped-review, risking phase bleed and scope creep. Fixes are additive — existing dispatches keep working.

## [3.5.8] - 2026-04-17

### Added
- **`/aped-sprint` auto-injects `/aped-story` into each Story Leader via `workmux add -p`.** Previously the skill told the user to manually type `/aped-story <key>` in each window. With the `-p` flag (inline prompt, supported since workmux 0.1.x), claude launches with the prompt already queued — zero manual step per worktree. This is not an auto-chain of approvals: `/aped-story` is the Leader's own first act on its own branch, nothing is approved or merged yet.
- **`/aped-lead` now delegates merge to the workmux `/merge` skill** when `review-done` is approved. `workmux setup` installs `/merge`, `/rebase`, `/coordinator`, `/worktree`, `/open-pr` as companion skills; `/merge` handles commit+rebase+merge+cleanup in one step. Lead pushes `/merge` via `workmux send` instead of recommending the raw `workmux merge` CLI. Fallback preserved for setups without `workmux setup`.
- **Handle convention documented.** Workmux slugifies branches into handles and places worktrees at `<project>__worktrees/<handle>`. SKILL explains how to recover handle/path via `workmux list` and `workmux path`.

### Changed
- **`.workmux.yaml.example` uses `claude --permission-mode bypassPermissions` as the pane command.** Parallel sprints launching N Story Leaders cannot stop at every tool-call prompt — the copied `.claude/settings.local.json` already captures allow/deny rules, so bypassPermissions trusts that inventory. Users who prefer interactive permissions can swap to `claude` or restore the `<agent>` placeholder.
- **`/aped-sprint` Path A drops `-a claude`.** The pane command now defines how claude launches (with flags), so the `-a` override is redundant. Workmux still auto-detects the built-in `claude` agent for prompt injection.
- **`/aped-lead` push step prefers `workmux send` over raw `tmux send-keys`** when workmux is available (handle resolves naturally, output lands in the right pane, plus agent-status hooks fire).
- User instructions after dispatch rewritten to reflect the new "no manual per-window step" reality.

## [3.5.7] - 2026-04-17

### Fixed
- **`workmux.yaml.example` now copies `.claude/` and `.aped/` in full.** 3.5.6 only copied `.claude/settings.local.json` under the assumption that `.aped/` and most of `.claude/` would be in the worktree via git. Live test surfaced that many APED users gitignore both directories entirely as user-local tooling (CloudVault's `.gitignore` excludes both). On those setups, a fresh worktree has NEITHER the APED machinery NOR the Claude settings — Claude Code fails on the very first prompt because its registered `UserPromptSubmit` hook points to `.aped/hooks/guardrail.sh` which isn't there.
  - New `copy` list: `.env*`, `.mcp.json`, `.claude/`, `.aped/`.
  - Template comments explain that copying is unconditional on purpose — harmless duplicate if the project tracks these paths, vital if it gitignores them.
  - `/aped-sprint` SKILL description aligned: "copy" is what makes the worktree functional, not just secret/env handling.

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

[Unreleased]: https://github.com/yabafre/aped-claude/compare/v3.7.1...HEAD
[3.7.1]: https://github.com/yabafre/aped-claude/compare/v3.7.0...v3.7.1
[3.7.0]: https://github.com/yabafre/aped-claude/compare/v3.6.0...v3.7.0
[3.6.0]: https://github.com/yabafre/aped-claude/compare/v3.5.9...v3.6.0
[3.5.9]: https://github.com/yabafre/aped-claude/compare/v3.5.8...v3.5.9
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
