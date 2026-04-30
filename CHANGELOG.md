# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.12.0] - 2026-04-30

Phase 3 audit C-compiler R1 absorption (agent #3). Three deterministic phase verifiers ship with the C-compiler `ERROR <code>: <reason>` convention. Skills cite the oracle in their Self-review / Validation section as canonical pre-merge gate; legacy `validate-*.sh` kept for backwards compat.

### Added

- **Oracle scripts (3 of 6)** — C-compiler-convention deterministic phase verifiers (`src/templates/scripts.js`). Each script wraps or extends an existing `validate-*.sh` and produces output as `ERROR <code>: <reason>` per line so any grep pipeline can find violations without natural-language parsing. The article (anthropic.com/engineering/building-a-c-compiler) explains the convention: *"if there are errors, Claude should write ERROR and put the reason on the same line so grep will find it."* Skills cite the oracle in their Self-review / Validation section as the canonical pre-merge check; legacy `validate-*.sh` kept for backwards compatibility.
  - **`oracle-prd.sh`** at `<apedDir>/aped-prd/scripts/oracle-prd.sh`. Verifies E001 file-exists, E002 required sections present, E003 FR count 10-80, E004 hyphenated FR form (4.7.6 normalisation lock), E006 no anti-pattern words in FR text, E007 NFR has measurable threshold (number + unit).
  - **`oracle-arch.sh`** at `<apedDir>/aped-arch/scripts/oracle-arch.sh`. NEW (no legacy predecessor). Verifies E010 every PRD FR is referenced in arch, E011 component has Owner field, E012 component has Tech stack field, E013 ADR template fields filled.
  - **`oracle-epics.sh`** at `<apedDir>/aped-epics/scripts/oracle-epics.sh`. Wraps validate-coverage.sh. Verifies E020 every PRD FR covered by ≥1 epic, E021 every epic has ≥1 story.
- **`tests/oracle-scripts.test.js`** — 15 tests across the 3 oracles: manifest shape, exit-code-on-missing-file, error-code-per-failure-mode, OK-on-clean-input.

### Changed

- **`aped-prd.md` Validation section** — runs `oracle-prd.sh` alongside the legacy `validate-prd.sh`. Lists all 6 error codes (E001-E007) and their fixes. Do not ship the PRD until `oracle-prd.sh` exits 0.
- **`aped-arch.md` Self-review checklist** — new `[ ] Oracle pass` step running `oracle-arch.sh`. Surface any `ERROR Eddd:` line verbatim to the user and HALT.
- **`aped-epics.md` Validation section** — runs `oracle-epics.sh` alongside `validate-coverage.sh`. Both E020 (uncovered FR) and E021 (empty epic) block downstream aped-story / aped-dev.
- **SECURITY.md supported version** — `4.11.x ✓ / < 4.11 ✗` → `4.12.x ✓ / < 4.12 ✗`. Users on 4.11 or earlier should upgrade.

## [4.11.0] - 2026-04-30

Phase 3 superpowers Tier 7 absorption (issues #1098, #1233, #1234, #1266, #1294 — closed by Jesse 2026-04 in superpowers, now in APED). Pure skill-body discipline + lints. No engine, no hooks.

### Changed

- **`aped-brainstorm` Phase 4 Convergence — per-survivor grounding table mandatory before recommending** (`src/templates/skills/aped-brainstorm.md`). Pocock workshop convergence trap (superpowers issue #1266 — recommendations flip when followed up because the first pass was vibing). Each surviving idea now requires a 4-row table: Assumptions / Failure modes / Disqualifiers / Evidence basis. "Strong intuition" is explicitly NOT a valid evidence basis. Survivors whose evidence basis is "first principles" auto-flag for `aped-grill` before downstream PRD/arch handoff.
- **`aped-brainstorm` Phase 5 Output — Assumptions / Unknowns / Out-of-scope blocks mandatory** (`src/templates/skills/aped-brainstorm.md`). Superpowers issue #1098 (brainstorm sessions historically dropped the unstated decisions a downstream PRD/arch agent had to re-discover). The output template now requires three named blocks: `## Assumptions in play` (with sources), `## Unknowns surfaced` (with recommended owner), `## Out of scope (declared during brainstorm)`. Each Top Survivor entry echoes the 4-row grounding table from Phase 4. Downstream `aped-prd` / `aped-arch` MUST NOT treat an absent block as "no assumptions" — they verify by reading.
- **`aped-brainstorm` Placeholder scan — bare deferrals without successors flagged** (`src/templates/skills/aped-brainstorm.md`). Superpowers issue #1294 (drift through unowned deferrals). Phrases like "later" / "when X comes up" / "someone will pick this up" are placeholders unless paired with a concrete successor (follow-up ticket ID, `aped-grill` handoff, or explicit `## Out of scope` entry).
- **`aped-story` — new `## Step 0: Quote current symbols` section before `## File structure design`** (`src/templates/skills/aped-story.md`). Superpowers issue #1234 (lessons absorbed by Jesse 2026-04 but not by APED until 4.11.0): "the most common plan-vs-reality mismatch is the writer's mental model of the code differing from the actual code at write time." For any task that modifies existing code, the story Dev Notes must include a verbatim quoted block of the current symbol(s) being changed (function signature, type definition, exported constant, current return shape, current error path). Greenfield stories must explicitly state `### Existing code: none — this is a new file.` Silent skip is the bug pattern this section closes.
- **`aped-dev` — new "Verbatim spec-quote rule" in TDD section** (`src/templates/skills/aped-dev.md`). Superpowers issue #1233. Above each test AND each non-trivial code block for an AC, paste the literal AC text as a comment (3 lines) with the format `// AC-N (verbatim from story X-Y-key:lineN): <full text>`. Vague ACs that resist verbatim quoting are story bugs — surface via `aped-story --refine`, never invent your own clearer wording.
- **SECURITY.md supported version** — `4.10.x ✓ / < 4.10 ✗` → `4.11.x ✓ / < 4.11 ✗`. Users on 4.10 or earlier should upgrade.

### Added

- **`tests/superpowers-tier7-absorption.test.js`** — locks the four 4.11.0 skill-body disciplines: aped-brainstorm Phase 4 grounding table + first-principles → aped-grill escalation; aped-brainstorm Phase 5 Assumptions/Unknowns/Out-of-scope blocks; aped-brainstorm successor enforcement on placeholder scan; aped-story Step 0 ordering + greenfield no-silent-skip; aped-dev verbatim spec-quote rule. Each assertion uses semantic-anchor regex (not exact-string) so future copy-edits don't break gratuitously.

## [4.10.0] - 2026-04-30

Phase 3 Pocock workshop absorption — H5 deferred → shipped. Opt-in PostToolUse advisory hook that automates the `Confirmed RED:` witness check from 4.8.0. No engine changes, additive only — existing installs unaffected unless the user opts in via `aped-method tdd-red-marker`.

### Added

- **`aped-method tdd-red-marker` opt-in PostToolUse advisory hook** (`src/templates/hooks/tdd-red-marker.js`, `src/templates/optional-features.js#tddRedMarkerTemplates`, `src/subcommands.js`, `src/index.js`). Pocock workshop discipline (L1742-1769): TDD requires watching the test fail before writing the implementation. The 4.8.0 `aped-dev` RED phase requires the agent to emit a literal `Confirmed RED: <test> failed at <file:line> — <reason>` token before any GREEN-phase Edit. This hook automates the witness check: PostToolUse on Write/Edit/MultiEdit; if the target is a non-test file (production code) AND the recent transcript shows a recent test-file edit AND no `Confirmed RED:` token between them, emit advisory via `additionalContext`. Test-path detection via 13 regex patterns (`.test.{ts,tsx,js,jsx}`, `.spec.{ts,tsx,js,jsx}`, `_test.{go,py}`, `test_*.py`, `.e2e.{ts,tsx}`, `.cy.{ts,tsx}`, `/__tests__/`, `/tests/`, `/spec/`, `/specs/`). Neutral files (markdown, json, yaml, toml, lock, .env, CHANGELOG, README, anything under `.aped/`) bypass the check entirely. Same install template pattern as `worktree-scope` (4.7.0) and `verify-claims` (4.0.0). 6-second timeout (Node cold-start + 200-line transcript tail + regex scan). Advisory only — never blocks. Pinned by `tests/tdd-red-marker-hook.test.js` (10 behavioural tests) and `tests/tdd-red-marker-install.test.js` (4 template-shape tests). Refs: Phase 2 H5 deferred → Phase 3 audit Pocock transcript Top 5 #1 + #2.

### Changed

- **README.md** — `## Maintenance & optional add-ons` and `## Operational commands` sections list the new `aped-method tdd-red-marker` subcommand. Three lines of doc + one line in each block.
- **SECURITY.md supported version** — `4.9.x ✓ / < 4.9 ✗` → `4.10.x ✓ / < 4.10 ✗`. Users on 4.9 or earlier should upgrade.

## [4.9.0] - 2026-04-30

Phase 3 audit residue MINOR. Five hallucination classes closed via deterministic scripts + skill-body discipline + lints. No engine changes, no opt-in hooks, no new top-level skills — pure-additive.

### Added

- **`scripts/detect-package-runner.sh` — deterministic package runner detection** (`src/templates/scripts.js`). Replaces four "or equivalent" hallucination sites in `aped-ship.md` (typecheck command) and `aped-dev.md` (monorepo workspace name + dev server). Decision tree is pure: `bun.lockb` → bun, `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` or no lockfile → npm. Caller pattern: `PKG=$(bash {{APED_DIR}}/scripts/detect-package-runner.sh) && "$PKG" run typecheck`. Exit code 2 with stderr `ERROR: no package.json …` when called outside a JS project. Pinned by `tests/detect-package-runner-script.test.js` (10 tests covering manifest shape, all 4 lockfile paths, precedence when multiple lockfiles co-exist, default-to-cwd behaviour, skill-body-no-longer-says-equivalent regression check). Refs: Phase 3 audit H18.
- **Anti-Claude-Code-trigger-word lint** (`tests/skill-no-cc-trigger-words.test.js`). Generalised from superpowers issue #1283 (the systematic-debugging skill body literally contained "Ultrathink this" — silently picked up by Claude Code's keyword scanner on every invocation). APED is clean today (0 hits across all 30 skills); this lint locks the absence so future skill additions cannot silently re-introduce the footgun. `TRIGGER_WORDS` covers `ultrathink`, `ultra-think`, `think hard/harder/deeply`, `megathink`, `mega-think`, `think a lot`. Add to the list when Anthropic ships new keywords.
- **`tests/last-test-exit-discipline.test.js`** — locks the 5-skill standardisation on `.aped/.last-test-exit` as the canonical test-pass evidence file. Closes the H21 hallucination class (each skill picks a different cache file at runtime, all of them imaginary).
- **`tests/skill-existence-assertion.test.js`** — locks the explicit "if state.yaml is absent" / "if .aped/.last-test-exit is absent" fallback branches in 4 skills. Closes the H11 implicit-state-assumption class.

### Changed

- **`aped-status.md` Step 1** — replace "the last test log is fresh (< 10 min old)" prose (pre-4.9.0 hallucinated cache path) with explicit `<worktree>/.aped/.last-test-exit` canonical read. State.yaml read now has explicit "if absent → no state.yaml — pipeline not started yet" halt; do NOT invent a phase or fabricate a dashboard.
- **`aped-qa.md` Test Coverage Report** — `run-tests.sh` invocation now followed by explicit `.aped/.last-test-exit` exit-code check. *"Do NOT report 'QA complete' based on a 'looks like it passed' reading of stdout."* The canonical evidence is the cache file.
- **`aped-quick.md` Self-Review checklist** — every gate now requires fresh evidence pasted in this message (Iron Law from `aped-review.md` applied to the quick path). `[ ] Tests pass` upgraded to `cat .aped/.last-test-exit` returned `0` AND test files touched.
- **`aped-retro.md` Phase 6 Readiness** — "All tests passing? Coverage sufficient?" now followed by "Verify, don't assume — `cat .aped/.last-test-exit` should return `0`". If absent or stale (>1 day for a retro), run tests before asserting.
- **`aped-debug.md` Discovery** — `.aped/.last-test-exit` is no longer "if captured" but "canonical exit-code cache". Added explicit fallback: if absent, run `bash {{APED_DIR}}/aped-dev/scripts/run-tests.sh` once before continuing — debugging from a missing test signal is debugging in the dark.
- **`aped-ship.md` § 3 typecheck** — uses `PKG=$(bash {{APED_DIR}}/scripts/detect-package-runner.sh)` instead of `pnpm typecheck`. Comment about the 4 pre-4.9.0 "or equivalent" hallucinations preserved as a discipline anchor.
- **`aped-dev.md`** — two "or equivalent" sites (line 303 monorepo `packages/contract`, line 343 dev server) replaced with deterministic detection. The `packages/contract` line points to reading `package.json` `workspaces` glob / `turbo.json` / `pnpm-workspace.yaml`; the dev-server line uses `detect-package-runner.sh`.
- **`aped-zoom-out.md`** — explicit "Missing artefacts are signal, not error" paragraph. State.yaml absent = pre-pipeline; `lessons.md` absent = no logged decisions. Each output bullet must cite the source it drew from; bullets backed by no source are forbidden.
- **SECURITY.md supported version** — `4.8.x ✓ / < 4.8 ✗` → `4.9.x ✓ / < 4.9 ✗`.

## [4.8.0] - 2026-04-30

Phase 3 Pocock workshop transcript absorption. Five surgical edits to existing skills + one new alignment skill. No engine work, no opt-in hooks — pure-additive MINOR. Bundled with the routing-improvements + audit-residue work that didn't fit the 4.7.6 patch surface.

### Added

- **`aped-grill` skill — Pocock-style relentless one-question alignment** (`src/templates/skills/aped-grill.md`). Pins down a half-formed product idea, plan, or refactor by asking ONE concrete question per turn, each targeting an unstated decision the user hasn't made. Loads any prior PRD / arch / CONTEXT.md / pasted ticket as grounding; if none exist, surfaces "cold-start grill" explicitly. Stop conditions: (a) no new meaningful question for two consecutive turns, (b) token budget exceeds 25k since grill start (Pocock workshop ceiling — past this the model enters the dumb zone, L93-108 + L777-787), (c) user halt, (d) five consecutive `out-of-scope` tags = reframing detected. Emits `grill-summary.md` with `decided` / `deferred` / `out-of-scope` sections + `assumptions in play` + `suggested next skill` (one of `aped-prd` / `aped-arch` / `aped-brainstorm` / re-grill). `disable-model-invocation: true` — explicit user invocation only. Cross-link in `aped-prd.md` On Activation: when no upstream artefact exists, recommend `aped-grill` first. Skill count: 29 → 30. Ref: Phase 3 audit Pocock transcript Top 5 #5.
- **TDD `Confirmed RED:` witness token requirement in aped-dev RED phase** (`src/templates/skills/aped-dev.md`). After running tests, the next assistant message MUST contain a single line `Confirmed RED: <test-name> failed at <file:line> — <reason>` where `<reason>` is the actual error from the test runner, not a paraphrase. Pocock's discipline (workshop L1742-1769): *"It tends to try to cheat at the tests because it's sort of doing it in layers"* — the witness token makes cheating mechanically harder. Skip only when continuing GREEN on an already-RED test in the same session. Pinned by `tests/schema-identifier-grounding.test.js`. Refs: Phase 2 H5 deferred → Phase 3 audit Pocock transcript Top 5 #1.
- **Schema-identifier grounding rule in aped-dev RED phase** (`src/templates/skills/aped-dev.md`). Before writing ANY migration / table name / column name / enum value / API path, grep the upstream story file and PRD for that exact identifier (case-sensitive). If the literal name does not appear verbatim in either source, HALT and ask the user — never invent. Closes the canonical hallucination class from Pocock workshop L1858-1866 (agent invented a `point_events` table never mentioned in any PRD/story). Pinned by `tests/schema-identifier-grounding.test.js`. Refs: Phase 3 audit Pocock transcript Top 5 #4.
- **Drift-trigger section in aped-checkpoint** (`src/templates/skills/aped-checkpoint.md`). New `## Step 1b: Drift triggers — read your own last 5 turns` runs before Step 2 summary. Five trigger rows: wrong artefact location, horizontal slice, wrong-backend invocation, test-pass without RED witness, schema/identifier invention. Any single trigger HALTs and re-anchors with file:line evidence — Pocock-style inline correction (workshop L1180-1198, L1338-1347), not "interesting observation". Pinned by `tests/schema-identifier-grounding.test.js`. Refs: Phase 3 audit Pocock transcript Top 5 #3.
- **`tests/schema-identifier-grounding.test.js`** — locks the four 4.8.0 skill-body discipline anchors (Confirmed RED token, schema grounding, fresh-context hard stop in aped-review, drift triggers in aped-checkpoint, aped-grill stop conditions). Each assertion checks a specific semantic anchor (regex on the discipline phrasing) so future copy-edits don't break tests gratuitously while still failing if the discipline is dropped.

### Changed

- **aped-review fresh-context hard stop in same-session reviews** (`src/templates/skills/aped-review.md` Step 1 fresh-read discipline block). If the reviewer is running in the same Claude session that just implemented the story, abort immediately and surface "Reviewer must run fresh — prior implementation context will bias the review. Run `/clear` then re-invoke `aped-review`." Pocock's discipline (workshop L1697-1722): *"the reviewer will be dumber than the thing that actually implemented it"*. Closes Phase 2 H9 (originally marked "already covered by aped-receive-review 6-step pattern" — but the explicit hard-stop on shared-session reviewers was never written into aped-review itself). Pinned by `tests/schema-identifier-grounding.test.js`.
- **aped-checkpoint state.yaml read has explicit fallback for absent state** (`src/templates/skills/aped-checkpoint.md` Step 1). On greenfield mid-flight (no state.yaml yet), report "no state.yaml — pre-pipeline checkpoint" and continue with git-only inputs; do not invent a phase. Refs: Phase 3 audit H11 (file-existence assertion).
- **`tests/skill-cross-ref-lint.test.js` KNOWN_SUFFIXES** extended with `grill` so future skill bodies that mention it via the bare form get flagged at lint time.
- **README skill counter** updated from `29 skills` to `30 skills` at the two anchored locations (intro paragraph + skill-list section).
- **SECURITY.md supported version table** bumped from `4.7.x ✓ / < 4.7 ✗` to `4.8.x ✓ / < 4.8 ✗`. Users on 4.7 or earlier should upgrade before reporting issues.

## [4.7.6] - 2026-04-30

Patch release. Fixes a critical packaging bug that broke `aped-method session-start` for every 4.7.5 install, plus low-risk hardening surfaced by the Phase 3 8-agent audit (residual hallucination audit, smoke test, Pocock transcript re-read, Superpowers issue scan).

### Fixed

- **`aped-method session-start` shipped broken in 4.7.5** (`package.json`, `scripts/smoke-pack.js`). The `files` allowlist glob `src/templates/hooks/*.js` was `.js`-only, so `src/templates/hooks/session-start.sh` never made it into the npm tarball. Result: every user who ran `aped-method session-start` after `npm i aped-method@4.7.5` got `Error: ENOENT … templates/hooks/session-start.sh`. Same root cause as 4.2.1 B2 (the recursive-glob lesson) — the patch never extended to `.sh`. Fix: glob expanded to include `*.sh`. Smoke-pack guard at `scripts/smoke-pack.js:44` now also asserts `session-start.sh` is present in the extracted tarball, so the regression cannot re-ship.
- **`worktree-scope` subcommand absent from `aped-method --help`** (`src/index.js:99-115`). Registered in `SUBCOMMANDS` since 4.7.0 but never surfaced in the help text — users could install it only by reading the README. Added under `visual-companion` in the `SUBCOMMANDS` block.
- **FR / NFR / AC ID format drift across skills standardised on the canonical hyphenated form** (`src/templates/skills/aped-epics.md`, `aped-prd.md`, `aped-story.md`, `aped-from-ticket.md`, `aped-course.md`). The 4.5.0 H6 running-FR-matrix already used `FR-1` in its canonical block, but six other skill examples still wrote `FR1` / `AC2` / `FR8`. Validate-coverage.sh, oracle scripts, and any future MCP atom contract parses one shape only — drift would silently false-pass coverage. Normalised every example to `FR-N` / `NFR-N` / `AC-N`. Pinned by `tests/fr-id-cross-skill-format.test.js` (it.each over all 30 skills).
- **`aped-context` Phase 5 doc-freshness silently treated shallow git checkouts as fresh** (`src/templates/skills/aped-context.md:65-90`). On CI clones with `--depth=1`, `git log -1 --format=%cI -- "$doc"` returns only the head commit; the mtime comparison would mark every doc `fresh`. Now gates the freshness scan on `git rev-parse --is-shallow-repository`; on a shallow checkout, every doc is classified `unknown` (which downstream skills treat as `stale` for routing). The `unknown` description was also tightened: "Treat as stale for routing purposes — never fresh."
- **`aped-lead` jq read silently defaulted to `agent_status=DONE` on a parse failure** (`src/templates/skills/aped-lead.md:67-92`). `2>/dev/null` swallowed every jq error; the post-parse guard then treated empty output as legacy data → `DONE` → auto-approve. Now captures stderr to a temp file and surfaces a non-zero jq exit as `agent_status=NEEDS_CONTEXT` (refuse to auto-approve). The `// "DONE"` jq fallback is preserved for the legitimate "missing field on legacy entries" case.
- **`aped-status` ticket cache treated `now` as the file mtime when both `stat` forms failed** (`src/templates/skills/aped-status.md:138-155`). The chained `stat -c %Y || stat -f %m || echo "$now"` swallowed the failure into "cache age = 0" → cache treated as fresh forever. Now emits `999999` (force refresh) and surfaces a stderr warning when both forms fail.

### Added

- **Description-routing trigger phrases** added to 8 skill descriptions (additive only — no removal). `aped-checkpoint`: "show me the diff", "walk the diff", "what just happened", "summarize the changes". `aped-dev`: "TDD", "TDD cycle", "red green refactor", "failing test first", "generate unit tests". `aped-ship`: "open the umbrella PR", "end of sprint", "composite review". `aped-receive-review`: "address PR comments". `aped-arch-audit`: "pass-through wrappers", "audit module depth". `aped-from-ticket`: "pickup from Linear", "pickup from Jira", "work on this ticket", "start the GitHub issue". `aped-zoom-out`: "are we still solving the right problem". `aped-write-skill`: "add a custom slash command", "scaffold a skill". Closes the routing weaknesses surfaced by the Phase 3 smoke test (B3, B4) and the residual-hallucination audit (H17). Pure-additive — every existing trigger still routes; new phrases just give the model more anchors.
- **`tests/fr-id-cross-skill-format.test.js`** — 31 lints (one per top-level skill + canonical-example assertions) that fail any future skill body which writes `FR1` / `NFR1` / `AC1` instead of the hyphenated form. Strips fenced JSON / YAML / regex / HTML code blocks from the scan so legitimate non-hyphen forms (external system identifiers) pass through; bash blocks ARE scanned because that's where IDs the model writes back land.
- **`tests/error-swallow-discipline.test.js`** — sentinel test that fails when a new `2>/dev/null` swallow is introduced without an entry on the explicit allowlist. Each allowlist entry pairs a documented reason (out-of-scope-KB scan, jq-with-stderr-capture, stat fallback with empty-check, workmux idempotent close) so the next maintainer can audit each swallow's failure mode. Companion assertions verify the three 4.7.6 fixes are in place (shallow-repo guard in `aped-context`, NEEDS_CONTEXT fallback in `aped-lead`, force-refresh in `aped-status`).
- **`tests/find-polluter-script.test.js`** — `find-polluter.sh` was the only state-mutation/diagnostic script in `scripts.js` without test coverage. Locks: ships in manifest with `executable: true`, refuses to run with no args, has either an `ERROR <code>:` C-compiler-grep convention or a `Usage:` banner, idempotent re-install. (The 7 other scripts the residual audit flagged — `sync-state.sh` / `validate-state.sh` / `migrate-state.sh` / `check-auto-approve.sh` / `check-active-worktrees.sh` / `log.sh` / `worktree-cleanup.sh` — are already covered by `tests/sprint-scripts.test.js`. This was an audit-agent hallucination caught by direct grep before acting.)

## [4.7.5] - 2026-04-30

### Changed

- **All top-level APED skills now open with an `## On Activation` block** (`src/templates/skills/aped-*.md`). Injected before the first `## ` section in 27 skills (skipped: `aped-checkpoint`, `aped-zoom-out`, which are stateless micro-utilities). The block reads `{{APED_DIR}}/config.yaml` upfront and resolves `{user_name}` / `{communication_language}` / `{document_output_language}` / `{ticket_system}` / `{git_provider}`, with `✅ YOU MUST` contracts on speak/write language and a HALT if config is missing. Mirrors the BMAD activation pattern. Closes the failure mode where the agent began Phase 1 of a skill (Discovery, Setup, etc.) before having loaded config — speaking English while `communication_language: fr`, ignoring `ticket_system`, etc. Duplicated `Read \`{{APED_DIR}}/config.yaml\` — extract …` steps inside `## Setup` were removed and following list items renumbered. Skill-specific keys (e.g. `from_ticket.story_placement.mode`, `base_branch`) remain documented in their original sections.

## [4.7.0] - 2026-04-30

Worktree-scope advisory hook (Phase 2 §P4 from the roadmap, deferred from 4.5.0 — no engine work, isolated subcommand). Targets the parallel-sprint failure mode where exploration agents return main-checkout paths and Write/Edit lands changes on `main` instead of inside the worktree.

### Added

- **`aped-method worktree-scope` opt-in PreToolUse advisory hook** (`src/templates/hooks/worktree-scope.js`, `src/templates/optional-features.js#worktreeScopeTemplates`, `src/subcommands.js`, `src/index.js#SUBCOMMANDS`). The hook fires on `Write` / `Edit` / `MultiEdit` only when the project has an active APED worktree marker (`<apedDir>/WORKTREE`). On match, it resolves both the target path and the worktree root via `realpathSync` (catches macOS `/var → /private/var` and any in-worktree symlink that escapes), and emits an advisory via `additionalContext` if the target lands outside. Advisory only — never blocks the tool call. Five-second timeout (Node cold-start + 2 realpaths is well under). Same install pattern as `safe-bash` / `verify-claims` / `post-edit-typescript`. README "Maintenance & optional add-ons" + Quickstart code block + the `SUBCOMMANDS` Set in `src/index.js` updated. Pinned by `tests/worktree-scope-hook.test.js` (7 behavioural tests covering tool-name filter, marker-absent skip, in-worktree allow, symlink-escape advisory, absolute-path-escape advisory, missing-input safety, new-file Write resolution) and `tests/worktree-scope-install.test.js` (4 template-shape tests). Refs: Phase 2 audit P4 (Superpowers issue #1040).

## [4.6.0] - 2026-04-30

First Tier 2 expansion drop — two horizontal/meta skills land. Subsequent minors will add `aped-grill-with-docs`, `aped-method reconfigure`, `aped-method extract-context`, `aped-pre-commit`. Skill count: 27 → 29.

### Added

- **`aped-zoom-out` skill — step back from current task to verify alignment with original goal** (`src/templates/skills/aped-zoom-out.md`). Tiny horizontal skill (Pocock `zoom-out` style, ~20 lines body) that produces no artefact — just a 4-bullet re-orientation message: where we started, where we are, drift if any, recommendation. Reads recent state.yaml + top of lessons.md + last 20 commits + the original goal source (PRD / brief / ticket / first user message). Use when implementation has been deep in details too long and the original framing is fading. `disable-model-invocation: true` — explicit user invocation only. Adapted from Matt Pocock's `zoom-out` skill (MIT). Skill count: 27 → 28.
- **`aped-write-skill` skill — meta-skill for writing APED-style Claude Code skills** (`src/templates/skills/aped-write-skill.md`). Walks the user through scope discovery (what / when / what-not / single-file-vs-multi-doc / rigid-vs-flexible), frontmatter drafting with all APED lint requirements baked in, body sections in order, multi-doc decomposition rules, a Self-review checklist, and output paths (project-local `.aped/skills/aped-X.md` or user-global `~/.claude/skills/aped-X.md`). Single-file medium-length skill (~190 lines body). The Self-review checklist enforces the same invariants APED's CI lint tests check on every commit — description quoting (`tests/skill-frontmatter-lint.test.js`), fully-qualified `aped-X` cross-references (`tests/skill-cross-ref-lint.test.js`), explicit slash after `{{APED_DIR}}` (`tests/scaffold-references.test.js`). Adapted from Matt Pocock's `write-a-skill` skill (MIT). Skill count: 28 → 29.

### Changed

- **README skill counter** updated from `27 skills` to `29 skills` at the two anchored locations (intro paragraph + skill-list section), per the pre-merge checklist invariant in `CLAUDE.md`.
- **`tests/skill-cross-ref-lint.test.js` KNOWN_SUFFIXES** extended with `zoom-out` and `write-skill` so future skill bodies that mention them via the bare form (e.g. `the zoom-out skill`) get flagged at lint time.

## [4.5.0] - 2026-04-30

Continuation of the Phase 2 hallucination-hardening pass. Two surgical content adds in existing skills (no engine work, no new opt-in features). Skill count unchanged (27).

### Changed

- **`aped-epics` surfaces a running FR-coverage matrix per epic, not only at the end** (`src/templates/skills/aped-epics.md`). New `### Running FR coverage matrix` subsection inside Story Listing. After completing each epic's story list, the agent renders an `FR ID × story-keys × status` table and surfaces it to the user. Three trigger points: (a) end of every epic's story list, (b) immediately when an FR is covered by ≥3 stories (over-fragmentation flag), (c) immediately when ≥30% of FRs remain uncovered after 50% of estimated stories are drafted (sequencing-risk flag). Surfacing coverage early prevents the "Story 14 is the only place FR-7 lands" surprise that's painful to fix late. The end-of-skill `## FR Coverage Map` is now the final report; the running matrix is what the user sees during the design loop. The `**FRs covered**` bullet now also requires explicit FR IDs (e.g. `FR-1, FR-3, FR-7`) — no vague "auth-related FRs" — and surfaces drift to the user instead of inventing one. Pinned by `tests/skill-discipline-content.test.js`. Refs: Phase 2 audit H6.
- **`aped-context` adds a Phase 5 Doc Freshness Audit** (`src/templates/skills/aped-context.md`). New section after Phase 4 Dependency Audit. Every documentation file under root or `docs/` (`README.md`, `requirements.md`, `architecture.md`, `prd.md`, ADRs, …) is classified `fresh` / `stale` / `unknown` based on its mtime versus the most-recent commit on the modules it references; docs predating the latest module commit by >30 days are tagged `stale`. Stale docs carry an explicit warning in `project-context.md` and downstream skills (`aped-analyze`, `aped-prd`, `aped-arch`) MUST NOT treat them as source-of-truth without explicit user override (refresh / historical-context / override menu). The Self-review checklist gains a `Doc freshness classified` gate. Pinned by `tests/skill-discipline-content.test.js`. Refs: Phase 2 audit H8 (Pocock workshop L2167 — "the actual code has changed so much from the original PRD that it's almost unrecognizable").

## [4.4.0] - 2026-04-30

Foundation for Phase 2 §S1: the scaffolder engine now accepts skill *directories* alongside the single-file legacy layout. No production skill is migrated in this release — subsequent minors will refactor the 5 heaviest skills (`aped-review` 620L, `aped-epics` 542L, `aped-arch` 493L, `aped-dev` 482L, `aped-ux` 460L) one PR at a time, each leveraging the directory layout to split overflow into companion docs without inflating the `SKILL.md` body that gets routed.

### Added

- **Scaffolder engine accepts skill *directories* alongside single-file skills** (`src/templates/skills.js`). Skills can now ship as either the legacy `src/templates/skills/aped-X.md` (single file) or the new `src/templates/skills/aped-X/SKILL.md` plus optional companions (`process.md`, `references/rules.md`, nested subdirectories). Both layouts emit identical scaffold output paths under `<apedDir>/aped-X/` — single-file skills produce one `SKILL.md`, directory skills produce `SKILL.md` plus every companion at the same relative path. `{{APED_DIR}}`, `{{OUTPUT_DIR}}`, `{{CLI_VERSION}}` substitution applies to every file in the directory, not just `SKILL.md`. The non-routable `aped-skills/` bucket continues to be excluded. A duplicate-name check throws if a skill is defined as both a file and a directory simultaneously. New helpers `listSkillEntries(dir)` and `skillsFromDir(c, dir)` are exported for fixture-based tests. This is the foundation for Phase 2 §S1: heavy skill refactors (`aped-review` 620L, `aped-epics` 542L, `aped-arch` 493L, `aped-dev` 482L, `aped-ux` 460L) will move to the directory layout in subsequent minor releases without changing the public scaffold output. Pinned by `tests/skill-directory-layout.test.js` (10 contract tests covering both layouts, nested companions, bucket exclusion, duplicate guard, and substitution propagation). Backwards-compatible — every existing single-file skill continues to scaffold byte-for-byte identical output.

## [4.3.0] - 2026-04-30

Hallucination-hardening pass (Phase 2 §H1-H10 / P1 / P6 from `docs/implementation-artifacts/phase-2-roadmap-2026-04-30.md`). All changes are surgical inserts in skill bodies plus three new lint / content tests; no engine refactor, no scaffold-output structural change. Skill count unchanged (27).

### Changed

- **Skill description anti-triggers tighten routing under known collisions** (`src/templates/skills/aped-{checkpoint,dev,qa,status}.md`). Four descriptions gained explicit anti-triggers that disambiguate adjacent skills: (a) `aped-checkpoint` description was typoed `aped-check` — fixed to `aped-checkpoint`, plus a new "not for sprint progress dashboards — see aped-status" anti-trigger; (b) `aped-dev` adds "Not for hotfixes or single-file isolated changes — see aped-quick"; (c) `aped-qa` adds "Not for unit tests written during TDD RED — those are owned by aped-dev"; (d) `aped-status` adds "Not for walking through a diff — see aped-checkpoint". Pinned by `tests/skill-discipline-content.test.js`. Refs: Phase 2 audit H1.
- **Skill bodies route exclusively via fully-qualified `aped-X` cross-references** (`src/templates/skills/aped-lead.md`). The single residual bare reference ("the sprint skill") was replaced with backtick-qualified `aped-sprint`. Pinned by the new lint in `tests/skill-cross-ref-lint.test.js` which scans every skill body for `the X skill / workflow / command` and `invoke|run X` patterns where X is a known APED suffix without the `aped-` prefix. Refs: Phase 2 audit H2 (Superpowers issues #1002, #1439).
- **`aped-dev`, `aped-quick`, and `aped-review` declare an explicit Fresh-read discipline** (`src/templates/skills/aped-dev.md`, `src/templates/skills/aped-quick.md`, `src/templates/skills/aped-review.md`). New section instructs the agent to Read every source-of-truth file fresh from disk in this skill (story, PRD, architecture, UX spec, lessons) and to never trust a cached or compacted summary. Compaction routinely drops FR/NFR text and scope-boundary language; tests / impl / review grounded in the post-compact summary drift. Pinned by `tests/skill-discipline-content.test.js`. Refs: Phase 2 audit H7 (Pocock workshop L262 compaction critique).
- **`aped-arch` Phase 2 requires every technology decision to cite PRD FR/NFR IDs** (`src/templates/skills/aped-arch.md`). The recommendation step now reads "cite the specific PRD FR/NFR IDs the choice satisfies (e.g. 'Postgres recommended — satisfies NFR-3 (ACID), NFR-7 (relational analytics), FR-12')". Decisions without citations are surfaced as drift to the user, not invented; the recorded decision in `architecture.md` MUST include the cited IDs. Pinned by `tests/skill-discipline-content.test.js`. Refs: Phase 2 audit H10.
- **`aped-dev` TDD section requires tests to trace to ACs and FR/NFR IDs** (`src/templates/skills/aped-dev.md`). Inserted a "FR/NFR grounding" guard before the TDD cycle: every test must trace to a specific AC, every AC must trace to a PRD FR or NFR ID; missing citations surface to the user instead of guessing the requirement. Pinned by `tests/skill-discipline-content.test.js`. Refs: Phase 2 audit H10.
- **`aped-epics` hard-stops on missing architecture when state declares it `done`** (`src/templates/skills/aped-epics.md`). Required-input validation now adds a conditional ✱ for architecture: if `pipeline.phases.architecture.status == done` in `state.yaml` and no architecture file is found in the discovery globs, HALT with a clear message + escape-hatch (set `architecture.status: skipped` if architecture was deliberately skipped). Pinned by `tests/skill-discipline-content.test.js`. Refs: Phase 2 audit P1.
- **`aped-claude` block template declares gates mandatory regardless of harness auto-mode** (`src/templates/skills/aped-claude.md`). New rule in the APED Block Template — wherever a skill says ⏸ HALT or ⏸ GATE, the agent waits for explicit user confirmation; auto-mode (Opus 4.7 auto-mode, headless harnesses) does not bypass APED gates. Pinned by `tests/skill-discipline-content.test.js`. Refs: Phase 2 audit P6 (Superpowers #1441).

### Added

- **Lint tests for skill frontmatter description and cross-references** (`tests/skill-frontmatter-lint.test.js`, `tests/skill-cross-ref-lint.test.js`). The first walks every skill's frontmatter and asserts `description:` is wrapped in single or double quotes (catches the unquoted-`: ` silent-skip footgun, Superpowers #955). The second walks every skill body and flags bare "the X skill" / "invoke X" / "run X" references where X is a known APED skill suffix without the `aped-` prefix. Refs: Phase 2 audit H2, H3.

## [4.2.1] - 2026-04-30

PATCH release covering four critical bugs verified by the Phase 2 audit (8-agent research, 2026-04-30) on shipped 4.1.3 / 4.2.0. All fixes are pure bug fixes with regression tests; no API change, no skill addition, no engine refactor. Skill count unchanged (27).

### Fixed

- **`{{APED_DIR}}aped-X/...` substitution resolved to non-existent paths** (`src/templates/skills/aped-{analyze,context,course,dev,epics,prd,qa,quick,review,sprint,status,story,ux}.md`). The substitute helper in `skills.js` concatenates the `{{APED_DIR}}` placeholder with the project's `apedDir` config value (default `.aped`, no trailing slash); skill bodies that wrote `{{APED_DIR}}aped-X/...` (no leading slash) expanded to `.apedaped-X/...` — every Read of those references silently failed in the agent. Fixed by switching all skill bodies to the explicit `{{APED_DIR}}/aped-X/...` form (~25 lines across 13 skills). The new `tests/scaffold-references.test.js` walks every `.aped/...` reference in scaffolded SKILL.md files and asserts each path exists in the scaffolder universe; `.apedaped-` is hard-banned. Surfaced by Phase 2 audit (8-agent research, 2026-04-30).
- **`aped-skills/*.md` and `visual-companion/*` were missing from the published tarball** (`package.json`). The `files` array glob `src/templates/skills/*.md` is non-recursive — the 3 sub-skill reference docs (`anthropic-best-practices`, `persuasion-principles`, `testing-skills-with-subagents`) under `aped-skills/` were excluded; `src/templates/visual-companion/{start-server.sh, frame-template.html}` was not listed at all. Both directories are now in `files`; `scripts/smoke-pack.js` walks the extracted tarball and refuses on any missing required file.
- **`post-edit-typescript` hook bypassed its `projectDir` prefix check via symlinks** (`src/templates/hooks/post-edit-typescript.js`). On macOS where `tmpdir()` resolves through `/var → /private/var`, and on any project containing a symlink that points outside its root, the `absolutePath.startsWith(projectDir)` string check passed even when the resolved file was outside the project — `prettier --write` and `eslint --fix` then rewrote a file the user did not intend. The hook now resolves both paths via `realpathSync` before the check and exits 0 if either resolution fails. Pinned by `tests/post-edit-typescript-symlink.test.js`.
- **`aped-qa` skipped Input Discovery — generated tests against invented ACs and unknown frameworks** (`src/templates/skills/aped-qa.md`). Every other producer skill (`aped-prd`, `aped-arch`, `aped-dev`, `aped-epics`) ships a glob-discover + ✱-required + HALT block before doing work; `aped-qa` jumped straight from Setup to Scope Selection with no story-existence guard and no framework-detection HALT. Added the standard Input Discovery block: glob locations, ✱ required completed story files, framework detection across `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` / config files, discovery report with `[C]` continuation menu. Pinned by `tests/aped-qa-input-discovery.test.js`.

## [4.2.0] - 2026-04-30

Combines Phase 0 hardening (six PATCH-level audits — APED block token shrink, `keep-coding-instructions` flag on every skill, removal of count anchors, PRD `## Out of Scope` template requirement, hard/soft dep classification with explicit setup pointers, hook crash safety) with Phase 1 feature additions (`aped-arch-audit` skill for codebase deepening candidates, `aped-iterate` post-ship router, `.aped/.out-of-scope/` knowledge base consulted by intake skills, `aped-debug` restructured around Pocock's 6-phase feedback-loop diagnosis model, `ticket-git-workflow.md` reference doc reduced to render only the configured providers). All informed by the same external research: Matt Pocock's workshop + skills repo, Anthropic engineering posts on code-execution-with-mcp / building-c-compiler / managed-agents, and Superpowers issues. Skill count: 25 → 27.

### Added

- **`aped-arch-audit` skill — surface deepening candidates in an existing codebase** (`src/templates/skills/aped-arch-audit.md`). Translation of Matt Pocock's `improve-codebase-architecture` skill into APED voice; identifies *shallow modules* (interface nearly as complex as the implementation) that could be merged into deep ones for higher leverage and locality. Iron Law: *SURFACE CANDIDATES, NEVER AUTO-REFACTOR* — the skill produces a report at `{{OUTPUT_DIR}}/architecture-audit.md` and HALTs; the user picks which candidates to act on via `aped-story` / `aped-dev`. Body inlines the Pocock vocabulary (8 terms — module / interface / implementation / depth / seam / adapter / leverage / locality — plus forbidden synonyms and the deletion-test litmus), the four dependency categories from DEEPENING (in-process / local-substitutable / remote-but-owned / true-external) with seam discipline ("one adapter means a hypothetical seam, two means a real one"), and the optional "Design It Twice" parallel sub-agent flow (Phase 5, opt-in only via the grilling loop's `[P]` menu — never default-spawned). Distinct from `aped-arch`, which decides *new* architecture and writes `architecture.md`; `aped-arch-audit` audits *existing* code and writes `architecture-audit.md`. Soft-dep classification — works on any codebase, brownfield or greenfield. Multi-doc decomposition (companions LANGUAGE.md / DEEPENING.md / INTERFACE-DESIGN.md) deferred to Phase 2 alongside the planned `aped-dev` refactor when the scaffolder gains directory-skill support. Skill count: 26 → 27. Refs: Pocock workshop L1938–2015 (deep modules), Pocock skills repo `improve-codebase-architecture/{SKILL,LANGUAGE,DEEPENING,INTERFACE-DESIGN}.md` (MIT), upstream "Design It Twice" pattern from Ousterhout.
- **`aped-iterate` skill — post-ship router** (`src/templates/skills/aped-iterate.md`). New thin router that classifies a post-ship delta ("we shipped X, now we need Y") and recommends the right downstream skill (`aped-quick` / `aped-epics` / `aped-course` / `aped-prd` / `aped-arch`). Iron Law: *Classify FIRST, route SECOND* — the skill never auto-chains; the user invokes the recommended skill themselves. Closes the gap that `aped-quick` (too small), `aped-course` (mid-sprint with upstream-lock), and `aped-receive-review` (PR feedback) didn't cover. Discovery checks for active worktrees and HALTs with a redirect to `aped-course` if any story is in-progress / review-queued / review. Consults the `.aped/.out-of-scope/` KB introduced earlier in this section with the same K/O/U menu. Classification interview: Q1 layer (existing FR/NFR vs new capability vs architectural vs mix), Q2 blast radius (file-count tiers + scan-first branch), Q3 reversibility, then optional Q4 motivation / Q5 timeline pressure. Routing matrix biases one tier lighter when Q5 says timeline pressure is yes. Soft-dep classification — no config keys required, no upstream APED phase needed. Skill count: 25 → 26. Refs: Superpowers issues #921 / #1075 / #1192 / #1238 (post-merge "what now?" gap), Pocock workshop "iterate" pattern.
- **Out-of-scope knowledge base** (`.aped/.out-of-scope/<concept>.md`). New persistent rejection memory: each entry captures one scope decision the team should not re-litigate next sprint — frontmatter (`concept`, `rejected_at`, `decided_by`) + `## Why this is out of scope` rationale + append-only `## Prior requests` list. The directory ships empty (only a `README.md` explaining the format) on every fresh `npx aped-method` install. Three skills now consult the KB during discovery: `aped-from-ticket` scans after fetching the ticket and before drafting; `aped-quick` scans after Setup, using the title argument as input; `aped-prd` Section 2 (Out of Scope) gains a one-line cross-reference noting that durable per-PRD decisions can be promoted to the cross-PRD KB. Match heuristic is exact word equality on filename tokens (lowercase, strip punctuation, drop ≤2-character tokens and stop-words like `add`/`fix`/`update`/`the`); resolved entries' `-resolved-YYYY-MM-DD` suffix is stripped before tokenising so old decisions still match. On match, the user picks `[K]` Keep refusal (abort), `[O]` Override (prepend a dated prior-request line, continue), or `[U]` Update (rename to `<concept>-resolved-<today>.md` with a closing note, continue). Multi-match adjudicates per-entry; any single `[K]` aborts the whole intake. Pre-4.2 scaffolds without the directory are treated as empty KB and skipped silently — backwards-compatible. Tests in `tests/out-of-scope-kb.test.js` lock the scaffold contract (4 cases). Refs: Pocock skills `triage/OUT-OF-SCOPE.md` + `.out-of-scope/` working examples.

### Fixed

- **APED Block Template injected into project CLAUDE.md shrunk from ~1437 to ~266 tokens** (`src/templates/skills/aped-claude.md`). The block was 141 lines / ~1437 tokens — read into Claude Code context every session, far above the ≤300 token target for trigger-rule push content. Removed Sections 2 (Working Rules), 4 (Task Management), 5 (Core Principles) — generic Claude Code best practices, not APED-specific. Removed Section 7's Red Flags table (12 rationalizations) and verbose skill-priority / skill-types subsections — deferred to a future `aped-discipline.md` (Phase 1+) loadable on demand. Removed Section 8 cheat sheet — replaced with a single-line pointer to `{{APED_DIR}}/skills/SKILL-INDEX.md` (generated by scaffold). Preserved: pipeline diagram, 1% rule (compact form), instruction priority (one sentence), all APED-specific rules (no auto-chain, validate-before-persist, story-driven dev, frontend visual verification), all paths, project metadata, and the `skill_invocation_discipline.enabled` toggle. Refs: Pocock workshop "smart zone" (~100K), Anthropic Managed Agents (push/pull split), Superpowers #1067 (1350-token bootstrap injection).
- **Count anchors removed from 4 skill bodies** (`aped-analyze.md`, `aped-arch.md`, `aped-dev.md`, `aped-epics.md`). Hardcoded counts in instructions ("all 5 sections", "all 4 files", "all 3 agents", "all 5 gate conditions") prime the model on artefact size and silently break when the artefact's shape changes. Replaced with count-agnostic phrasings that keep the explicit list (which is the actual contract). `aped-analyze` now names the parallel research personas (Mary, Derek, Tom) instead of counting them. Kept `aped-retro.md:295` ("all 5 stories done") — inside an `## Example` block, illustrative not instructional. Refs: Superpowers #1058 (anchoring biases LLM behaviour).
- **Four opt-in hooks hardened against own crashes** (`src/templates/hooks/{safe-bash.js, verify-claims.js, post-edit-typescript.js, session-start.sh}`). Each Node hook now installs `process.on('uncaughtException')` + `process.on('unhandledRejection')` handlers that exit 0 silently — preserves the advisory contract (never block the user's tool call) even on bad input or internal error. `session-start.sh` switched from `set -uo pipefail` to `set -euo pipefail` (errexit added; every potentially-failing command in the script was already wrapped with `||` fallback, so the change is safe). Public output API (stdout / exit codes seen by Claude Code) unchanged. Refs: Anthropic engineering "Building C compiler" (single-line errors / log-to-file — vacuously satisfied; hooks are silent-by-design), Superpowers #1142 / #871 / #1225 (Windows quoting + hook crashes — `${CLAUDE_PROJECT_DIR}` and `${APED_DIR}` already quoted defensively in `session-start.sh`; Node hooks now crash-safe).

### Changed

- **All 25 top-level skills declare `keep-coding-instructions: true`** in their frontmatter (`src/templates/skills/aped-*.md`). Without the flag, a skill's body can replace the user's project CLAUDE.md when the skill is invoked instead of augmenting it — the skill body wins where it shouldn't. Adding the flag ensures user CLAUDE.md (and `aped/config.yaml`) always wins when the two conflict, matching the instruction-priority rule already declared in the APED Block Template (Skill invocation section). Refs: Superpowers #1090, #846, #1108, #1187 — variants of the same root cause: skills overriding user-configured project state.
- **PRD output template now requires an `## Out of Scope` section** (`src/templates/config.js` for the generated `.aped/templates/prd.md`; `src/templates/skills/aped-prd.md` Section 2 bullets and Self-review lint). Without the section, downstream skills (epics, arch) inherit ambiguous boundaries and quietly widen scope. The new section sits between Product Scope and User Journeys with the prompt "what you considered and decided NOT to do, one-line why". The Self-review lint accepts "Non-goals (or Out of Scope)" — they're synonyms; the template uses "Out of Scope" to align with the Pocock convention. Refs: Pocock workshop L1509–1513 + L2226–2253 (PRD = destination doc, out-of-scope is the definition of done), Pocock skills `to-prd/SKILL.md` ("Implementation Decisions: no file paths"), Superpowers #895 (plans that over-specify implementation kill executor judgment).
- **Story Acceptance Criteria gain explicit behavioural-discipline check** (`src/templates/skills/aped-story.md` Self-review). New Self-review item enforces: ACs describe user-visible behaviour or interface contracts, not implementation paths or helper names. File paths and code blocks belong in Tasks, not ACs. ("The system rejects expired tokens" — yes. "The validateToken function in `src/auth/jwt.ts:42` throws TokenExpiredError" — no.) Refs: Pocock skills `triage/AGENT-BRIEF.md` (behavioural format, no paths or line numbers).
- **Skills classified hard-dep vs soft-dep with explicit setup pointers** (`docs/skills-classification.md` new; `> **Setup pointer.**` callouts added to 8 hard-dep skill bodies). 8 skills are hard-dep — 6 ticket-aware (`aped-from-ticket`, `aped-epics`, `aped-story`, `aped-ship`, `aped-receive-review`, `aped-quick`) and 2 sprint-state-bound (`aped-sprint`, `aped-lead`). The remaining 17 are soft-dep and stay token-light by design. Each hard-dep body now carries a one-paragraph pointer right after Critical Rules / Iron Law that names the config keys (`ticket_system`, `git_provider`) and the fall-back behaviour. The new reference doc documents the criteria and the per-skill rationale. Refs: Pocock skills repo `docs/adr/0001-explicit-setup-pointer-only-for-hard-dependencies.md`.
- **`ticket-git-workflow.md` reference doc renders only the configured providers** (`src/templates/providers/{issue-tracker,git-provider}.js` new; `src/templates/references.js` MODIFY; `package.json` files array updated). Previously, every scaffold shipped a 190-line monolithic doc covering all 5 ticket_system variants AND all 3 git_provider variants — even though each project uses one of each. The token waste accumulated on every read by `aped-epics`, `aped-sprint`, `aped-story`, `aped-quick`, and `aped-dev`. Refactor extracts each provider's section into a per-provider module with a dispatch function (`issueTrackerSection(ts)` / `gitProviderSection(gp)`); `references.js` imports them and assembles only the configured ones plus the common footer (Commit Message Format / State Sync / Epic Tracking / Critical Rules). A Linear + GitHub project now sees ~119 lines instead of 190 (-37%); `none` + Bitbucket renders even smaller. **Output path `{{APED_DIR}}/aped-dev/references/ticket-git-workflow.md` is unchanged** — consumer skills need no edit. Adding a new provider in the future = a new const + a dispatch entry in `providers/*.js`, no edits to `references.js`. Inspired by Pocock skills' `setup-matt-pocock-skills/issue-tracker-{github,gitlab,local}.md` per-provider docs convention.
- **`aped-debug` restructured around Pocock's 6-phase diagnosis loop** (`src/templates/skills/aped-debug.md`). Iron Law shifts from "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST" to **"THE FEEDBACK LOOP IS THE SKILL."** — the central insight is that without a fast deterministic pass/fail signal, debugging is staring at code; with one, hypothesise / instrument / fix become mechanical. New phase order: Build feedback loop (10 construction methods listed: failing test → curl → CLI → headless browser → trace replay → throwaway harness → property/fuzz → bisection → differential → HITL bash) → Reproduce → Hypothesise (3–5 ranked **falsifiable** hypotheses, shown to the user for re-rank before testing) → Instrument (one variable at a time; new `[DEBUG-XXXX]` 4-char-hex tag convention so cleanup is a single grep) → Fix + regression test (with explicit "no correct seam is itself the finding" exit ramp routing to `aped-arch-audit`) → Cleanup + post-mortem (commit-message body now captures the correct hypothesis + the falsified ones — *"Cause: …. Fix: …. Falsified hypotheses: …"*). APED-specific value preserved verbatim: the 3-failed-fixes rule (load-bearing for `aped-dev` HALT and `aped-review` Step 6 routing), the Invocation contexts contract (standalone / from `aped-dev` / from `aped-review`), and the sub-disciplines — Condition-based waiting folded into Phase 1, Root-cause tracing folded into Phase 4, Defense-in-depth folded into Phase 5. New Phase 6 handoff: recommend `aped-arch-audit` when the bug reveals architectural friction (no correct seam, shallow modules, tangled callers); recommend `aped-retro` when it reveals a process gap. Frontmatter `name: aped-debug` and the existing description triggers are preserved — no API break for callers. Refs: Pocock skills repo `skills/engineering/diagnose/SKILL.md` (MIT), Pocock workshop "feedback loop is a product".

## [4.1.3] - 2026-04-29

Documentation patch over **4.1.2**, plus one self-heal regression fix and a literal-path sweep flagged by post-merge ultrareview on PR #7. Engine surface for users already on 4.1.2 is unchanged for 99% of the code path — only one edge case in `migrate-state.sh` self-heal changes behaviour.

The 4.1.2 release notes were complete in `CHANGELOG.md` and the `aped-course` skill body, but the user-facing reference docs still carried 4.1.0 / 4.1.1 wording in three places: (a) `mark-story-done`'s "awk fallback lands status + completed_at" claim (false post-4.1.2 — it now hard-fails without yq), (b) the literal `docs/state-corrections.yaml` path in places where the actual default tracks `output_path`, and (c) TROUBLESHOOTING.md §11 didn't cover the silent-partial-success scenario that bit BonjourStalwart on 4.1.0 / 4.1.1. Plus a 4.1.2 self-heal regression: `expected_pointer` was hardcoded to the scaffold default instead of reading config.yaml, so users following the documented lock-step customization (`state.corrections_path` in config.yaml + matching `corrections_pointer` in state.yaml) had their pointer silently overwritten back to default whenever the target was empty.

### Fixed

- **`migrate-state.sh self_heal_corrections_pointer` honors `state.corrections_path` from config.yaml** — was previously hardcoded to `${output_path}/state-corrections.yaml` (the scaffold default). A user who customized `state.corrections_path` in config.yaml AND set `corrections_pointer` in state.yaml in lock-step (the documented customization path) had their pointer silently overwritten back to default whenever the target was empty/missing. Now self-heal calls `read_corrections_path()` (the same helper `migrate_v1_to_v2` uses) so config-driven customizations survive `aped-method --update`. Strict regression vs. pre-4.1.2 — state.yaml is in `preserveOnUpdate`, so customizations used to survive untouched. Regression test in `tests/sprint-scripts.test.js` covers the non-default config + empty-target case.

### Changed

- **`README.md`** — Requirements section now correctly classifies `yq` as hard-required for `migrate-state.sh`, `mark-story-done`, and `append-correction` (with awk fallbacks remaining only for `set-story-status` and friends). The "4.1.0 lifecycle hygiene" callout under Maintenance now mentions the 4.1.2 patches and clarifies that the corrections file path tracks `output_path` (e.g. `docs/aped/state-corrections.yaml` for the standard scaffold).
- **`docs/aped-quickstart.md`** — `mark-story-done` paragraph now states explicitly that yq is hard-required since 4.1.2 and explains why the previous awk fallback was broken (it could only rewrite existing fields, not insert `completed_at`).
- **`docs/aped-phases.md`** — schema-v2 corrections section clarifies that `corrections_pointer` tracks `output_path`. The 4.1.0 / 4.1.1 hardcoded literal is mentioned as historical context, with a pointer to `migrate-state.sh`'s 4.1.2 self-heal.
- **`docs/TROUBLESHOOTING.md` §11** — extended with **Symptom B** describing the silent-partial-success scenario (sister file written, state.yaml stayed v1, retries duplicated entries, sister file accumulated multi-document YAML). The recovery path now points users at `aped-method --update` on 4.1.2 — the self-heal handles dedup, multi-doc heal-on-read, and idempotent re-runs without manual intervention.
- **Stale `docs/state-corrections.yaml` literal sweep** — five spots that quoted the legacy scaffold default ("default `docs/state-corrections.yaml`") now correctly say the path tracks `output_path` and the default for the standard scaffold is `docs/aped/state-corrections.yaml`. Affected: `src/templates/skills/aped-course.md` v2 paragraph, `docs/aped-phases.md` (line ~252), `docs/aped-quickstart.md` (line ~182), `src/templates/config.js` state.yaml template comments (two spots), `src/templates/scripts.js` migrate-state.sh + validate-state.sh header comments. The CHANGELOG and the self-heal comment block intentionally name the legacy literal as historical context — left unchanged.

### Added

- **`docs/TROUBLESHOOTING.md` §15** — new section covering the 4.1.0 / 4.1.1 wrong-pointer bug and the 4.1.2 self-heal contract. Explains the symptom (pointer one level too high on default scaffolds, orphaned sister file), the automatic fix on `--update`, and the conservative behaviour: user data is never moved without explicit action — the self-heal only retargets when the wrong location is empty.

## [4.1.2] - 2026-04-29

Hotfix release covering one real-world bug surfaced by an upgrade on a v1 scaffold with existing corrections (BonjourStalwart) **plus** six findings from a multi-agent review of the 4.1.0 schema-v2 code (`/ultrareview` on PR #5). All seven fix the same delivery — the corrections-split + sync-state helpers shipped in 4.1.0. Engine surface is otherwise identical.

Anyone who already ran `npx aped-method --update` on a 4.1.0 / 4.1.1 build should upgrade to 4.1.2 and re-run `npx aped-method --update`. The migration is now self-healing in two senses: (a) it deduplicates correctly and refuses multi-document output during the v1 → v2 step, and (b) it retargets `corrections_pointer` to the right path on legacy v2 scaffolds where 4.1.0 / 4.1.1 wrote the wrong literal. No data is ever moved without the user's hand on the keyboard.

### Fixed

- **`migrate-state.sh` merge path produced multi-document YAML, which broke the count read and the state.yaml mutation downstream.** The `yq eval-all` recipe emitted one output document per input file by default, so the sister file ended up with 2 / 3 / N docs after every retry. `count=$(yq eval '.corrections | length')` then returned multi-line garbage, the state.yaml mutation interpolated that into an invalid yq expression, and schema stayed at v1 with the top-level `corrections:` block intact. Replaced with a single-doc `yq eval -n` + `load(...)` pattern; a regression guard refuses any multi-document output at the sanity-check step.
- **Dedup on `(date, type, reason)` failed across mixed scalar styles.** `unique_by([.a, .b, .c])` compares array nodes structurally and respects YAML scalar style — `type: minor` (plain) and `type: "minor"` (quoted) were treated as different. Replaced with a string-concat key `unique_by(.date + "|" + .type + "|" + .reason)` so re-running the migration after a partial failure now self-heals to the correct count.
- **Pre-4.1.2 sister-file corruption is forgiven on re-run.** When the merge path encounters a multi-document sister file (the pre-4.1.2 corruption shape), only the first document is read — the rest is dropped — and output is clean single-doc YAML. Combined with the dedup fix, a 4.1.0 / 4.1.1 user who re-runs `--update` on 4.1.2 lands on the correct schema-v2 state automatically.
- **`corrections_pointer` and `state.corrections_path` were hardcoded to the literal `docs/state-corrections.yaml`** in `src/templates/config.js`, instead of tracking the project's `outputDir`. For default scaffolds (`outputDir=docs/aped/`), the pointer was wrong by one level — the sister file shipped at `docs/aped/state-corrections.yaml` was orphaned, and `append-correction` wrote to `docs/state-corrections.yaml`. Both literals now use `${o}` interpolation. The migration's new self-heal step retargets the pointer on existing 4.1.0 / 4.1.1 scaffolds whose pointed-to location is empty (never relocates user data).
- **`append-correction` corrupted JSON whitespace and glob-expanded `*`/`?`/`[` against the cwd.** `read_cmd` did `set -- $line` unquoted, performing word-splitting and pathname expansion on the JSON blob. Multi-space runs in string values collapsed silently; a `*` inside a string would have been replaced with the cwd's file list. `read_cmd` now extracts the first word as the command and passes the remainder verbatim for `append-correction`; legacy commands still split, but with `set -f` to prevent globbing on story keys with shell metacharacters.
- **`append-correction` wrote v2 fields onto v1 state.yaml without a schema check.** On a legacy v1 scaffold with a top-level `corrections:` array, the helper would write `corrections_pointer/corrections_count` alongside, orphaning the legacy entries and producing a wrong count. Now refuses on v1 with a clear hint to run `migrate-state.sh` first.
- **`mark-story-done`'s awk fallback silently dropped `completed_at`.** The 4.1.0 release described it as a soft-degrade ("status + completed_at land; runtime fields stay"). In practice, `set_story_field`'s awk path can only rewrite existing fields — `completed_at` was being added, so it was silently dropped, leaving the audit trail incomplete. Refuses loudly now when yq is absent (matches `append-correction`'s pattern; matches the doctor's yq-warn diagnostic).
- **`append-correction`'s validator passed unvalidated blobs through when `node -e` exited non-zero.** The `node-failed` branch had no handler — `if [[ "$check" == "invalid-json" ]]` and `if [[ "$check" == missing:* ]]` both fell through. Now a `case` statement treats any non-`ok` value as a refusal.
- **Wrong backup-path string in two places.** `src/index.js`'s migration-failure error and `migrate-state.sh`'s header comment both hardcoded `docs/state.yaml.pre-v2-migration.bak`. Both now interpolate the project's `outputDir`.

### Added

- **Eight new regression tests.** `tests/no-slash-stubs.test.js`: scaffolded `corrections_path` + `corrections_pointer` track `outputDir` (default + custom). `tests/sprint-scripts.test.js`: (a) `append-correction` preserves multi-space JSON values, (b) `append-correction` does not glob-expand `*` in string values, (c) `append-correction` refuses on v1 schema with a migration hint, (d) `mark-story-done` refuses loudly when yq is missing from `PATH`, (e) the 4.1.2 self-heal retargets a wrong pointer when the empty-target condition holds, (f) the self-heal leaves a wrong pointer alone when user data lives at that location. Plus the two from earlier in this same release: the dedup recovery from a botched previous migration and the multi-doc corrupted sister file recovery.

### Changed

- **`aped-course` skill body** — the v1 fallback paragraph now states explicitly that `append-correction` refuses on v1 (since 4.1.2). Users on v1 are directed to `migrate-state.sh` first or to append directly to the legacy top-level `corrections:` array via the Edit tool.

## [4.1.1] - 2026-04-29

Documentation patch — brings `docs/` (the deep-dive references shipped with the package) in line with the 4.1.0 reality. No code, no test, no behaviour change. Engine is byte-identical to 4.1.0; users on 4.1.0 don't need to upgrade urgently — they only gain accurate prose.

### Changed

- **`docs/aped-phases.md`** — sync-logs section adds the retention block + `aped-method sync-logs prune` subcommand + `meta` extension. Corrections-log section describes the schema v2 split (pointer + count + sister file + helper) with v1 fallback note. Schema-normalization section split into v1 (since 3.12.0) / v2 (since 4.1.0) sub-sections; the anachronistic *"bump reserved for 4.0.0"* line is gone.
- **`docs/aped-workflow.md`** — `What gets scaffolded` lists `state.yaml` with v2 top-level slots (`corrections_pointer` + `corrections_count` replacing v1's top-level `corrections`), `state-corrections.yaml` as a sibling output, and the `sync_logs.retention` config block + prune subcommand.
- **`docs/aped-quickstart.md`** — sync-logs section gains the retention paragraph; state.yaml schema section split into v1 / v2 with explicit migration call-out (auto on `--update`, idempotent, backed-up). Mentions `mark-story-done` and the yq dep stance.
- **`docs/TROUBLESHOOTING.md`** — four new sections: (11) recovery path when `migrate-state.sh` fails during `--update`, including the backup-restore commands; (12) how to verify the schema version of a given scaffold and what a clean v2 state.yaml looks like; (13) enabling retention to stop sync-logs piling up + the `aped-method sync-logs prune` one-shot sweep; (14) what to do when corrections land in the wrong file because `corrections_pointer` and `state.corrections_path` are out of sync.

## [4.1.0] - 2026-04-29

Lifecycle hygiene release. Three coupled goals: bound the long-term growth of `docs/sync-logs/` (retention), uniformize how skills extend sync-log JSON (cmd_meta), and bound the growth of `state.yaml` itself (mark-story-done runtime trim + corrections split into a sister file). The state.yaml schema bumps `1 → 2`; `aped-method --update` runs `migrate-state.sh` automatically and the migration is idempotent + non-destructive (backup written).

This is also where the post-4.0 doc residue gets cleaned up (commit `7d8990a`): `SECURITY.md` no longer claims the scaffolder may delete from `config.commandsDir` (retired in 4.0.0), and the `aped-method doctor` 3.x-residue diagnostic level (warn, non-blocking) now matches what the docs say.

### Added

- **Sync-logs retention** (opt-in) — config block `sync_logs.retention.{mode, keep_last_n}` with default `mode: none` preserving the previous behaviour. On every successful `sync-log.sh end`, prunes the oldest provider-scoped logs beyond the retention window. New CLI subcommand `aped-method sync-logs prune [--apply] [--provider=NAME]` (default dry-run) for one-shot manual sweeps. Provider isolation is enforced via filename pattern matching so a Linear sync never touches GitHub logs.
- **`sync-log.sh meta` subcommand** — writes top-level keys (peer to `phases`/`totals`) for course-correction extensions like `trigger`, `scope`, `source_pr`, `merged_at`. Reserved keys (`sync_id`, `provider`, `started_at`, `ended_at`, `operator`, `directive_version`, `phases`, `totals`) are rejected so the audit-trail spine stays intact. Keys must be snake_case (jq-path safety). Documented with usage example in `aped-course`.
- **`sync-state.sh mark-story-done <key>`** — atomic helper that flips story status to `done`, sets `completed_at` (ISO UTC), and clears runtime fields (`worktree`, `started_at`, `dispatched_at`, `ticket_sync_status`). Permanent fields (`merged_into_umbrella`, `ticket`, `depends_on`, custom user fields) are preserved (blocklist trim). Replaces the pseudo-code flip in `aped-lead`'s review-done approval handler — the skill now reads umbrella + worktree path BEFORE the flip (since `worktree` is one of the trimmed fields).
- **`docs/state-corrections.yaml`** — append-only log split out of `state.yaml`. Configurable via `state.corrections_path` in `config.yaml` (default shown). state.yaml carries `corrections_pointer` (the runtime source of truth) and `corrections_count` (length cache).
- **`sync-state.sh append-correction <json>`** — atomic helper that appends to the corrections file, validates required keys (`date`, `type`, `reason`, `artifacts_updated`, `affected_stories`), and updates `corrections_count` in state.yaml in lock-step. Replaces direct `Edit`-tool appends in `aped-course`.

### Changed

- **state.yaml schema bump 1 → 2** — top-level `corrections` is removed; `corrections_pointer` + `corrections_count` take its place. `validate-state.sh` accepts both versions; in v2 a residual top-level `corrections:` is a hard error (telling the user to run `migrate-state.sh`).
- **`migrate-state.sh` 1 → 2 implementation** — extracts corrections, writes them to the pointer file (merging if it already has content), removes the top-level block, adds pointer + count, bumps `schema_version`. Backup at `docs/state.yaml.pre-v2-migration.bak`. Idempotent on v2. Triggered automatically by `aped-method --update` as a Phase-3 task (after scaffold, so the freshly-installed migrate script runs).
- **`docs/aped-phases.md` + `README.md`** — doctor's 3.x-residue diagnostic is now described as `warn` level (non-blocking, exitCode stays 0), matching `src/doctor.js` behaviour.
- **`README.md`** — adds a one-line callout under the tagline pointing 3.x users at the [Migrating from 3.x](#migrating-from-3x) section before they run `--update`.

### Removed

- **`SECURITY.md:57`** — `config.commandsDir` from the list of paths the scaffolder is allowed to delete from. The surface was retired in 4.0.0; the doc lagged behind.

### Migration

`npx aped-method --update` runs `migrate-state.sh` automatically. The migration is non-destructive (backup written) and idempotent. Existing v1 scaffolds that haven't migrated continue to work — `aped-course` and any future reader fall back to top-level `corrections:` when no pointer exists. Sync-log retention is opt-in (default behaviour preserved). `cmd_meta` and `mark-story-done` are additive (no skill currently in the wild depends on either).

`yq` is recommended for full done-flip cleanup (`mark-story-done`) and is required for `migrate-state.sh` (v1 → v2 needs structural YAML manipulation). The awk fallback for `mark-story-done` lands status + `completed_at` and warns on stderr; runtime fields stay until yq is installed.

## [4.0.0] - 2026-04-29

The 3.12.0 deprecation cycle ends. The 25 `/aped-X` slash-command shells scaffolded under `.claude/commands/` are gone — skills are the only invocation surface. Claude Code now reaches APED skills through the standard `.claude/skills/<name>/SKILL.md` discovery path (a new symlink target wired into the auto-detect layer). This is a clean break: anything that worked through skills in 3.12 keeps working; anything that depended on the slash shells does not.

### Removed

- **`.claude/commands/aped-*.md` stub generator** — `src/templates/commands.js` (332 lines, exporting `COMMAND_DEFS` + `commands(c)`) deleted. `getTemplates()` no longer emits anything under `.claude/commands/`.
- **`commandsDir` engine surface** — `DEFAULTS.commandsDir`, the `--commands=DIR` CLI flag, the interactive "Commands dir" prompt, the `commands_path:` key in `aped/config.yaml`, and the per-skill slash listing in the install summary. The YAML whitelist no longer accepts `commands_path:`, so legacy values pass through silently (see Migration).
- **`commands: { suppress_deprecation_banner: false }` config block** — banner is gone, suppression is meaningless.
- **`docs/COMMANDS.md` + `scripts/generate-command-catalog.js`** — the catalog had no purpose without the underlying shells; the `npm run generate:catalog` script entry is removed.
- **`tests/from-ticket-wiring.test.js`** — asserted the shape of `commands()` output; replaced by `tests/no-slash-stubs.test.js` which guards the inverse contract (zero stubs, zero `commands_path` in the scaffolded yaml).

### Changed

- **`.claude/skills/` joins the cross-tool symlink auto-detect layer** — marker `.claude` (now created up-front during scaffold so a fresh greenfield project still picks Claude Code up). The pre-3.7.5 "double-registration" risk that excluded `.claude/skills/` is gone with the slash shells, so the historical exclusion is lifted. `TARGET_CATALOG` (used by `--fresh` and `aped-method symlink`) keeps `.claude/skills` for cleanup parity.
- **Skill bodies + cross-skill references** — mechanical `/aped-X` → `aped-X` across the 25 top-level skills, the 3 reference docs under `aped-skills/`, the scaffolded `CLAUDE.md` template (Section 7 "Slash command deprecation (3.12.0)" → "Skill invocation (post-4.0.0)"), `src/templates/references.js` status template, and the user-facing strings in `src/templates/guardrail.js`. The guardrail's slash regex + the input-detection comments stay intact — users may still type `/aped-X` from muscle memory and the hook keeps catching them.
- **`SKILL-INDEX.md` generator** drops the leading `/` from every entry — the file consumed by the opt-in SessionStart hook now lists `- aped-prd — …` instead of `- /aped-prd — …`.
- **`aped-method doctor`** loses the `commands` check, gains a new `legacy-4x-residue` warn-level diagnostic that surfaces only when `.claude/commands/aped-*.md` stubs or a `commands_path:` key in `aped/config.yaml` exist on disk. Non-blocking: exitCode stays 0 so a 3.12 → 4.0 upgrade doesn't trip CI.
- **README + 6 docs files** (workflow, phases, personas, quickstart, troubleshooting, dev/discovery-pattern) rewritten skill-first. Tagline no longer mentions slash aliases. New `Migrating from 3.x` subsection in README with the cleanup commands.

### Migration

3.12 → 4.0 is a breaking version, but the data path is intentionally lenient. After `npx aped-method --update`:

1. Run `aped-method doctor` once. If it reports `legacy-4x-residue (warn)`, follow the printed `fix:` line — typically `rm -rf .claude/commands/aped-*.md` and removing the `commands_path:` line from `aped/config.yaml`. Both are safe to leave in place; the warning is informational.
2. If you maintain a `lessons.md` file produced by `aped-retro` in 3.x, the entries scoped `Scope: /aped-X` will not match 4.0 skill loaders — rewrite them to `Scope: aped-X` (mechanical `sed`). Lessons that don't match are silently skipped, not an error.
3. CI parsers that consumed `docs/COMMANDS.md` need to switch to reading skill descriptions out of `src/templates/skills/aped-*.md` directly (the file is gone in this release).

The `npm publish` workflow (`release.yml`) is unchanged — provenance attestation, smoke + check + test gates, GitHub release notes auto-extracted from this section.

## [3.12.0] - 2026-04-29

Tier 5 — Spec-reviewer dispatch on the four artefact-producing skills that lacked it (PRD, UX, Epics, Analyze) plus deprecation of all 25 slash commands ahead of 4.0.0 removal. Skills become the primary invocation surface; slash commands keep working on 3.x but are marked legacy.

Tier 6 — Native sync-logs + state.yaml schema normalization. Two coupled gaps surfaced post-Tier 5 by inspection of BonjourStalwart's organic state.yaml + sync-log JSON: ticket-system operations had no structured audit trail, and APED's `state.yaml` template was missing 8 patterns real projects re-invented incompatibly (top-level `schema_version`, provider-agnostic `ticket_sync`, `backlog_future_scope`, append-only `corrections`, and richer per-phase fields). Both ship together in the same 3.12.0 cycle; neither is breaking — existing scaffolds without the new blocks keep working.

### Added — Tier 6 — Sync-logs + state.yaml schema normalization

The two coupled goals close an audit-trail gap (every ticket-system push to Linear/GitHub/GitLab/Jira now leaves a forensic JSON record) and a schema gap (`state.yaml` becomes a richer, normalized source of truth so tooling can rely on field presence instead of re-inventing conventions per project). Patterns lifted from BonjourStalwart's organic post-Tier-5 evolution.

- **`aped/scripts/sync-log.sh` helper** — `start | phase | record | end` interface for emitting structured JSON audit logs at `docs/sync-logs/<provider>-sync-<ISO>.json`. Atomic writes via temp+mv; concurrent calls protected by mkdir lock with stale-recovery (reuses sync-state.sh pattern). Prefers `jq`, falls back to `node -e`. Configurable: `sync_logs.enabled: true` (default), `sync_logs.dir: "docs/sync-logs/"`. Disabled = silent no-op. Locked by 6 cases in `tests/sync-log.test.js`.
- **`/aped-epics`, `/aped-from-ticket`, `/aped-ship`, `/aped-course` wired to sync-log** — every ticket-system operation now emits an audit log with named phases (auth_check, ticket_fetch, projects, labels, milestones, modified_tickets, etc.) and `api_calls_total` totals. Self-review checklists gain a sync-log item.
- **`schema_version: 1` at top of `state.yaml`** — APED template now emits this. Backwards compat: existing scaffolds without it are treated as implicit 1 by `validate-state.sh`.
- **`ticket_sync` top-level block (provider-agnostic)** — `/aped-epics` writes after Ticket System Setup. Replaces project-specific `linear_sync` patterns with a normalized shape: `{provider, sync_id, sync_log, projects, milestones, modified_tickets, totals}`. Re-syncs append to `modified_tickets`.
- **`backlog_future_scope` top-level block** — explicitly-punted tickets, written by `/aped-epics` (initial sync if M2 buckets exist) and `/aped-course` (mid-sprint descopes). Shape: `{project_id, tickets: [{id, category}]}`.
- **`corrections` append-only log** — distinct from `lessons.md` (post-epic retros) and CHANGELOG (product-level). Written primarily by `/aped-course` when scope changes happen mid-sprint. Each entry: `{date, type, reason, artifacts_updated, affected_stories}`.
- **Phase-specific structured records** — `/aped-context` writes `{type: brownfield|greenfield|hybrid, generated_at, refreshed_at}`; `/aped-prd` writes `{fr_count, mode: interactive|headless}`; `/aped-arch` writes `{mode, councils_dispatched, adrs, watch_items, residual_gaps, epic_zero_stories}`; `/aped-epics` writes `{epic_count, story_count, fr_coverage, ticket_sync, synced_at}`. State.yaml becomes a richer source of truth for tooling.
- **`validate-state.sh` extended** — recognises `schema_version`, `ticket_sync`, `backlog_future_scope`, `corrections` as known top-level blocks. Errors on `schema_version > 1` with a clear "upgrade aped-method" message. Warns (not fatal) on unknown top-level blocks (forward-compat). Locked by 4 cases in `tests/sprint-scripts.test.js`.
- **`aped/scripts/migrate-state.sh` stub** — reserved call site for 4.0.0 schema migrations. Today: no-op for `schema_version: 1`, error on unknown.

### Added — Tier 5 — Spec-reviewer dispatch on 4 artefact-producing skills

The brainstorm Phase 5 dispatch pattern from Tier 4 (inline `### Spec self-review` checklist + `### Spec-reviewer dispatch` Agent-tool subagent that validates completeness / consistency / clarity / scope / YAGNI before the user gate) is lifted into the four other artefact-producing skills. NACK behaviour mirrors brainstorm: HALT → present issues → `[F]ix` (revise inline + re-dispatch once) / `[O]verride` (proceed with reason recorded as the first line of a `## Spec-reviewer Override` callout in the artefact). Each skill's `## Self-review` block gains a "Spec-reviewer dispatched and Approved (or [O]verride recorded)" item.

- **`aped-prd`** — dispatch inserted inside `## PRD Generation`, before the final user gate. Reviewer prompt calibrated to PRD-specific concerns: FR/NFR contradictions, missing acceptance criteria, ambiguous metrics, scope creep beyond MVP. Catches PRD bugs before they break `/aped-arch`.
- **`aped-ux`** — dispatch inserted inside `## F — FILL`, before the final user gate. Reviewer prompt calibrated to UX-specific concerns: screen/flow inconsistency, missing component inventory, accessibility gaps. UX coherence gate before downstream consumption.
- **`aped-epics`** — dispatch inserted inside `## Validation` (after FR Coverage Map, before Self-review). Reviewer prompt calibrated to epic/story concerns: granularity, orphan FRs, acyclic `depends_on`, FR-coverage gap vs PRD. Catches epic-level coherence drift before stories cascade.
- **`aped-analyze`** — dispatch inserted inside `## Phase 4: Synthesis` after `product-brief.md` is written, before `## Phase 5: Validation`. Reviewer prompt calibrated to product-brief concerns: market/domain/tech research consistency, weak evidence, non-falsifiable claims, scope clarity. Brief-level rigor gate.
- **`aped-analyze` also gains a `## Self-review (run before user gate)` block** — Tier 1 missed this skill when adding Self-review to the 11 artefact-producing skills; Tier 5 closes the gap alongside the dispatch.

### Deprecated — Slash commands (3.12.0 → removal target 4.0.0)

APED ships 25 skills + 25 slash commands that duplicate the skill descriptions verbatim. Industry trend (Anthropic Agent Skills, Superpowers ships skills-first, the Tier 4 CSO description principle) makes slash commands legacy — they're convenience aliases that double the maintenance surface (Tier 4 already created a desync bug: `aped-receive-review.md` shipped without its `COMMAND_DEFS` entry). Removal is breaking → 4.0.0; deprecation now in 3.12.0 gives users a migration window. **Slash commands continue to work in all 3.x versions** — only marked, never broken.

- **All 25 entries in `COMMAND_DEFS` (`src/templates/commands.js`) gain `deprecated: true`, `deprecatedSince: '3.12.0'`, `removalTarget: '4.0.0'`** — locked by 3 cases in `tests/sprint-scripts.test.js` (deprecation metadata + banner default-on + banner suppression-on).
- **Scaffolded `commands/aped-*.md` shells get a deprecation banner at the top** — banner template (path threaded through `apedDir` so it matches the body's `${CLAUDE_PROJECT_DIR}/${apedDir}/${skill}/SKILL.md` resolution — earlier draft hard-coded `aped/skills/...` which contradicted the body line): `> **Deprecated since 3.12.0** — slash commands will be removed in 4.0.0. Invoke the skill directly: read \`<apedDir>/<skill>/SKILL.md\` and follow it. This shell still works on all 3.x versions.` Suppressible via `commands.suppress_deprecation_banner: true` in `config.yaml` (default `false`) for projects whose CI scrapes command files. The shell still ends with the existing `Read and follow the SKILL.md at ...` line so slash commands resolve identically.
- **Spec-reviewer dispatch presence** locked by `tests/skill-content.test.js` (NEW, 16 cases — 4 skills × 4 assertions: dispatch heading, `Agent` tool reference, `Status: Approved | Issues Found` reviewer-output format, Self-review item).
- **`generate-command-catalog.js` `renderStatus()` throws on partial deprecation metadata** — if a future `COMMAND_DEFS` entry sets `deprecated: true` but omits `deprecatedSince` or `removalTarget`, the generator now throws with a descriptive error instead of silently rendering `-` (which would mask the deprecation in `docs/COMMANDS.md`).
- **`docs/COMMANDS.md` gains a top deprecation banner + a "Status" column** — every row renders `Deprecated (3.12.0 → 4.0.0)`. The Status column is forward-compat: future entries that omit deprecation fields render `-`. Generated by `scripts/generate-command-catalog.js`.
- **`README.md` Command catalog section pivots to skills-first messaging** — adds a deprecation banner at the top of `## Command catalog`, reframes the count line as "25 skills, each exposed via a now-deprecated slash command alias", and adds a `### Skill-first invocation (3.12.0+)` subsection explaining how to trigger skills via natural language phrases that match `description:` triggers, or via the Skill tool directly.
- **`aped-claude.md` Section 8 cheat sheet renamed `Skill cheat sheet`** — entries listed without leading `/` (just skill names). Section 7 (Skill Invocation Discipline) gains a deprecation note flagging slash commands as legacy.

## [3.11.0] - 2026-04-28

Tier 1 + Tier 2 + Tier 3 + Tier 4 of the Superpowers absorption (rhetorical + execution + process discipline + debug sub-disciplines + meta-skills) plus two lived-defect fixes.

### Added — Tier 4 — Superpowers second-pass absorption (debug sub-disciplines + meta-skills + dev-side discipline + brainstorm hardening + session-start)

A second cross-analysis of `obra/superpowers` against the Tier 1-3 absorption (four parallel research agents) found 11 disciplines the previous cycle missed. Biggest gaps: `/aped-debug` lifted only the 4-phase shell of `systematic-debugging` and ignored its three sibling sub-disciplines that carry the real diagnostic muscle; the entire `writing-skills` cluster (CSO description principle, persuasion principles, RED-GREEN-REFACTOR for skills) was absent; APED reviewed code but didn't teach receiving review; no agent-facing rule forced skill-invocation discipline at the CLAUDE.md level; `aped-brainstorm` had no spec-self-review gate before handoff to `/aped-prd`.

- **`/aped-debug` gains 3 sub-disciplines** — `### Sub-discipline: Root-cause tracing` in Phase 1 (instrument boundaries with `console.error`, trace backward, name the original trigger before exit), `### Sub-discipline: Condition-based waiting` in Phase 2 (replace `setTimeout` with `waitFor()` polling — 10ms, timeout-bounded, fresh getter inside loop; `condition-based-waiting-example.ts` reference impl shipped alongside), `### Sub-discipline: Defense-in-depth` in Phase 4 (4-layer validation pattern: entry / business logic / environment / debug — applied before declaring resolved). Iron Laws and forbidden patterns lifted verbatim from the corresponding Superpowers source files.
- **`/aped-receive-review` skill (NEW)** — closes the asymmetry: APED long had `/aped-review` (giving review) but no discipline for *receiving* it. Iron Law `NO PERFORMATIVE AGREEMENT — TECHNICAL VERIFICATION FIRST`. Forbidden-responses table (no "you're absolutely right!" capitulation), 6-step Response Pattern, YAGNI grep gate (don't implement on unused endpoints — grep first), multi-item clarification gate (HALT and ask before implementing if any item is unclear), acknowledgment templates that make pushback technical-not-stubborn.
- **`aped-skills/` reference directory (NEW)** — three reference docs callable on demand from any skill. `anthropic-best-practices.md` (CSO description principle, gerund naming, third-person, no-placeholders — foundation for future skill authoring). `persuasion-principles.md` (7-principle table verbatim, Meincke 2025 attribution, Authority/Commitment/Scarcity/Unity usage, ethical-use test — explains *why* Iron Laws work). `testing-skills-with-subagents.md` (RED-GREEN-REFACTOR mapping table, 7-pressure-type table, rationalization-table template, bulletproof checklist — the runner methodology for the Tier 3 harness).
- **`## Skill Invocation Discipline` block in CLAUDE.md template** — appends the 1%-rule (verbatim from `using-superpowers`: *"if there's even a 1% chance a skill is relevant, invoke it"*), 12-row rationalization table, instruction priority (user > skills > defaults), skill priority order (process first, implementation second). Ambient enforcement at session level — no longer purely opt-in via slash command.
- **`aped-brainstorm` Phase 4 hardening** — `### Spec self-review` checklist (placeholder scan + contradictions + scope + ambiguity + YAGNI) and `### Spec-reviewer dispatch` (Agent tool subagent dispatch with the verbatim reviewer prompt). Catches spec bugs before they burn `/aped-prd` cycles.
- **`aped-review` Marcus persona — Testing anti-patterns checklist** — 5 anti-patterns + their gate functions verbatim from `testing-anti-patterns.md`. Self-review item added: "Marcus checked for the 5 testing anti-patterns". Catches mock-as-test fraud during review.
- **`aped-dev` — Blocker-halt gate** — explicit STOP conditions (missing dependency, test fail, unclear instruction, repeated verification fail) + "never start on main without consent" rule. References `/aped-receive-review` from the post-review-feedback flow. Prevents wasted execution on broken plans.
- **`aped-story` and `aped-epics` — File structure design (upfront)** — new section before task / story breakdown. Maps files with single-responsibility rule (split by responsibility, not layer); 3-bullet decision template per file. Better task decomposition; coherent file boundaries across stories.
- **Skill-triggering harness — runner methodology** — `tests/skill-triggering/README.md` no longer placeholder. Lifts the RED-GREEN-REFACTOR-for-skills runner methodology, the TDD-mapping table, the 7-pressure-type table, and the Bulletproof Skill checklist verbatim from `testing-skills-with-subagents.md`. Three new pressure scenarios drop in: `aped-debug-time-pressure-emergency-fix.md` (production API down, $15k/min, manager pressure — adapted from Superpowers test-pressure-1), `aped-debug-sunk-cost-exhaustion.md` (4h debugging at 8pm, dinner waits — tests the 3-failed-fixes rule under exhaustion), `aped-receive-review-authority-pushback.md` (senior + tech-lead approve a quick fix without root cause — tests the new skill's pushback discipline). 4 scenario files total now.
- **Session-start hook (opt-in via `aped-method session-start`)** — reads `aped/skills/SKILL-INDEX.md` and emits its content as `additionalContext` on `SessionStart` (matchers `startup|clear|compact`). Silent on missing file. Default scaffold has no SessionStart entry — explicitly opt-in. Skill-index generator added to `scripts.js`: walks `templates/skills/` for `aped-*.md` files and emits one line per skill with its `description:` frontmatter, sorted deterministically. Locked by 3 cases in `tests/sprint-scripts.test.js`.
- **Visual companion (opt-in via `aped-method visual-companion`)** — bash HTTP server (port from `config.yaml`, default 3737) + `frame-template.html` with the CSS classes lifted from `visual-companion.md` (`.options`, `.cards`, `.mockup`, `.mock-nav`, etc.). No auto-launch in default scaffold.
- **`tests/lint-placeholders.test.js` — 3 cases for `aped-skills/` reference files** — verifies the lint passes despite legitimate reference content (illustrative `<placeholder>` mentions, "TBD" cited as banned, etc.). Pending-contract pattern: files materialise from the parallel skills agent in this same cycle.
- **`<!-- aped-lint-disable -->` / `<!-- aped-lint-enable -->` markers in `lint-placeholders.sh`** — reference docs that need to quote the banned tokens verbatim (e.g. `aped-skills/anthropic-best-practices.md` listing what the lint forbids) bracket those passages with these HTML-comment markers. The lint pre-pass blanks lines inside the bracket while preserving line count, so reported line numbers still match the source file. Locked by 1 regression case in `tests/lint-placeholders.test.js`. Keep the disabled span tight — never wrap a whole file.

### Added — process discipline (Tier 3, Superpowers absorption)
- **Two-stage review in `/aped-review`** — Eva (AC validator) now runs alone first as a synchronous blocking gate. On Eva PASS, the remaining specialists (Marcus, Rex, conditional domain specialists) dispatch in parallel as before. On Eva NACK, `/aped-review` HALTs and asks the user `[F]ix → return story to dev` / `[O]verride → proceed with remaining specialists despite the AC gap, with a recorded reason that prefixes the merged report`. Self-review checklist gains a Two-stage ordering item. Spec-compliance precedes quality — no more wasted dispatches on a story that's about to return to dev for an AC gap.
- **Subagent status protocol on `checkin.sh`** — `post` accepts an optional `--status <DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED>` flag. The status is the agent-confidence dimension, distinct from the existing kind (`story-ready | dev-done | review-done | dev-blocked`) and workflow status (`pending | approved | blocked`). Persisted in JSONL as `agent_status`. Default-status-for-kind: `story-ready/dev-done/review-done` → `DONE`, `dev-blocked` → `BLOCKED`. `DONE_WITH_CONCERNS` and `NEEDS_CONTEXT` require a non-empty reason; `--status BLOCKED` with kind `dev-done` is rejected (use kind `dev-blocked`); unknown statuses exit 1. `/aped-lead` reads `agent_status` first and routes accordingly: only `DONE` runs `check-auto-approve.sh`; `DONE_WITH_CONCERNS` surfaces the concern with `[A]pprove despite / [R]eturn-to-dev` choices; `NEEDS_CONTEXT` escalates priority HIGH and surfaces the question; `BLOCKED` flows through the existing dev-blocked path. Backward compatible — empty `agent_status` is treated as `DONE`. Locked by 7 cases in `tests/sprint-scripts.test.js`.
- **Skill-triggering harness placeholder** — `tests/skill-triggering/README.md` documents the pattern (control vs treatment subagents, pressure-axis prompts, behaviour assertions) lifted from Superpowers' "Writing skills" approach (TDD applied to process documentation). `tests/skill-triggering/scenarios/example-aped-debug-skip-investigation.md` is the canonical reference scenario shape, exercising `/aped-debug`'s Iron Law against a stacked sunk-cost + time-pressure + social-proof prompt. No runner shipped yet — the format is fixed so future cycles can drop in a vitest helper without re-litigating it.

### Added — execution discipline (Tier 2, Superpowers absorption)
- **`/aped-debug` skill** — new systematic debugging command. Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST. Four phases (Reproduce → Root-cause-trace → Fix-with-test → Verify) with explicit gates between each. Includes the **3-failed-fixes rule** lifted verbatim from Superpowers' `systematic-debugging`: after three attempts that didn't move the failure forward, the skill HALTs and questions the architecture/spec/test rather than letting the agent try fix #4. Self-review checklist + Invocation contexts (standalone / from `/aped-dev` on persistent test red / from `/aped-review` on root-cause findings). Registered in `COMMAND_DEFS`; `docs/COMMANDS.md` regenerated.
- **`## Verification gate` in `/aped-dev` and `/aped-review`** — operationalises the Iron Law "NO PASS WITHOUT FRESH EVIDENCE IN THIS MESSAGE". Lists the nine forbidden completion phrases (`should work`, `looks good`, `probably fine`, `tests should pass`, `should be ok`, `Done!`, `Great!`, `Perfect!`, `All set`) and the three accepted evidence forms (captured command output, diff with test output, screenshot reference). Same gate either side of the dev/review handoff.
- **`## Task granularity contract` in `/aped-story`** — five must-haves per task (exact file path, full code block, exact test command, expected output, literal commit step), 2–5 minute target runtime per task, forbidden-pattern table, and a concrete good/bad task example pair. Self-review checklist gains the granularity item.
- **`verify-claims.js` opt-in advisory hook** + `aped-method verify-claims` install command. PostToolUse on Bash. Scans tool output for the same nine forbidden phrases and emits an advisory when none of the evidence patterns (`PASS`, `Tests: N passed`, exit code 0, `✓`, etc.) appears within `verify_claims.evidence_window` lines (default 30) before the offending phrase, OR on the same line as the phrase. Phrase matching is word-boundary aware (rejects `doneness` matching `Done`). Falls back to `stderr` when `stdout` is empty. Hook timeout raised to 8s for cold-start tolerance. Never blocks. Off unless explicitly installed. Configurable via `verify_claims.enabled` (and `verify_claims.evidence_window: 0` to disable the window check entirely while keeping phrase scanning) in `config.yaml`. Locked by `tests/verify-claims.test.js` (regression cases include kill switch, evidence window, same-line evidence, word-boundary, stderr fallback, never-blocks, non-Bash skip, advisory cap). **Known limitations:** the hook scans Bash *tool output*, not agent prose — phrases that appear only in the agent's chat-side response are invisible to PostToolUse hooks. Use the in-skill Verification gate to catch those.
- **`/aped-debug` cross-references** — `/aped-dev` HALT Conditions add a "3-failed-fixes rule" pointer to `/aped-debug`; `/aped-review` Step 6 (Merge Findings) routes root-cause findings to `/aped-debug` rather than letting specialists guess. The 3-failed-fixes definition is unified across the three files: *three successive attempts that did not turn the original repro green* (a different test breaking does not count as "moved forward").

### Added — rhetorical discipline (Tier 1, Superpowers absorption)
- **`lint-placeholders.sh`** — reusable artefact lint script under `${APED_DIR}/scripts/`. Catches `TBD`, `TODO`, `FIXME`, `XXX`, `<placeholder>`, `<!-- placeholder -->`, `add appropriate error handling`, `similar to story N`, `similar to task N`, `implement later`, `to be defined`, `to be determined`, and lone-ellipsis lines. Mustache template tokens of the form `{{name}}` and `{name}` (where `name` is alphanumeric + underscore) are scrubbed before scanning so they never trip the lint; ellipsis mid-prose (`etc...`) is whitelisted. Exit 0 = clean, 1 = hits, 2 = file/config error. Disabled silently when `placeholder_lint.enabled: false` in `config.yaml`. Locked by `tests/lint-placeholders.test.js` (10 cases).
- **`placeholder_lint.enabled` flag** in `config.yaml` (default `true`). Lets projects with legitimate `TODO`/`TBD` use opt out without forking.
- **Iron Law / Red Flags / Rationalizations** sub-sections under `## Critical Rules` in `aped-{prd,dev,review,story}.md` — phase-specific named failure modes (e.g. `aped-dev`: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST" + Red Flags table for TDD shortcuts; `aped-review`: "NO PASS WITHOUT FRESH EVIDENCE IN THIS MESSAGE"). Modelled on Superpowers' Iron Law rhetorical pattern.
- **`## Self-review (run before user gate)` checklist** added to 11 artefact-producing skills (`aped-prd/arch/ux/epics/story/context/from-ticket/prfaq/brainstorm/retro/review`). Each ≤ 6 items: lint call, phase-specific consistency checks, ambiguity scan, required sections present. Skill HALTs if a check fails, presents `[F]ix` / `[O]verride (record reason)`.
- **`## Reader persona` section in `aped-story.md`** — verbatim "enthusiastic junior with poor taste, no judgement, no project context, and an aversion to testing". Canonical reader-target making granularity testable.

### Changed — frontmatter audit (Tier 1)
- **23 skill `description:` frontmatter values audited and tightened** to contain *only* triggering conditions (`Use when user says X` / `or invokes /aped-X` / discriminator caveats). Workflow-summary opening sentences (e.g. "Generates PRD section-by-section…", "Pulls a ticket from the configured ticket system, drafts a story…") were removed: agents that read description shortcuts and skip the body now get clean trigger signal instead of partial workflow narration. Real triggering phrases preserved verbatim; functional invocation cues unchanged.

### Fixed — lived defects (commit ccf0e28)
- **`/aped-arch` now writes `architecture.md` incrementally**, not as a single end-of-phase regeneration. Earlier behaviour deferred all writes until Phase 5, which made the final document fragile (one large generation, easy to drop sections), invisible to mid-phase status checks, and useless on session interruption — a partially-architected project left no trace. The skill now scaffolds a tracked `architecture.md` skeleton at Phase 0 (frontmatter `current_subphase`, `completed_subphases`, `last_updated`, `phases_planned`), appends each validated decision into its section in place after every gate, and mirrors progress into `pipeline.phases.architecture.{current_subphase,completed_subphases}` in `state.yaml`. The final Output step is a finalisation (status → done, last_updated bump), no longer a regeneration. Resuming an Arch session announces its `current_subphase` and skips ahead to the right gate. The `state.yaml` schema gains optional `current_subphase` / `completed_subphases` fields under any `pipeline.phases.<phase>` (additive, backward-compat — no required field, other phases may adopt the same pattern).
- **`guardrail.sh` no longer trips on conversational mentions of pipeline keywords.** The previous keyword-regex layer treated bare tokens (`review`, `prd`, `dev`, `epic`, `story`, `code`) as command intent, so prompts like _"bon petite review par rapport à ta proposition pour le prd"_ produced a `PREMATURE_REVIEW` warning even though the user was explicitly speaking *about* a proposal, not asking for a review. The intent layer is now semantic: a `WANTS_*` flag fires only when (a) the literal `/aped-<phase>` slash command appears, (b) the prompt is a single-word match (e.g. just `review`), or (c) the prompt is short (< 80 chars) and starts with an imperative tied to that phase. Conversational connectors anywhere in the prompt — FR (`par rapport à`, `concernant`, `à propos de`, `petite/petit`, `ta proposition`, `votre avis`) and EN (`about`, `regarding`, `your proposal`, `speaking of`, `with respect to`) — suppress bare-keyword matches; explicit slashes still fire. The hook stays advisory, keeps the 5-second timeout, and preserves rules 0–6 unchanged. Locked by `tests/guardrail-intent.test.js` (7 cases including the user-reported false positive).

## [3.10.2] - 2026-04-25

Cross-phase context flow. Pipeline-phase skills used to load upstream artefacts via `state.yaml` paths, which left brownfield context unread (`/aped-context`'s `project-context.md` was produced but never consumed by `/aped-analyze`, `/aped-prd`, `/aped-arch`, `/aped-epics`, `/aped-story`, `/aped-dev`, `/aped-review`); two skills referenced upstream documents in their prose without ever loading them at runtime; `/aped-retro` wrote `lessons.md` with a `Scope:` field that no skill consumed, so the post-epic feedback loop never closed. This release replaces state-path loading with a glob-based **Input Discovery** step at the entry of every pipeline-phase skill — modelled after BMAD's `step-01-init.md` and the existing `aped-from-ticket` precedent — and wires `lessons.md` into the three skills its `Scope:` field always targeted. Greenfield/brownfield is now detected, not declared: `/aped-context` and `/aped-analyze` are no longer mutually exclusive entry points.

### Added
- **Input Discovery section in every pipeline-phase skill** (`/aped-analyze`, `/aped-prd`, `/aped-ux`, `/aped-arch`, `/aped-epics`, `/aped-story`, `/aped-dev`, `/aped-review`). Each skill globs `{{OUTPUT_DIR}}/**`, `{{APED_DIR}}/**`, `docs/**` for the artefacts it consumes, hard-stops on missing required prereqs (e.g. architecture without a PRD), reports brownfield/greenfield inferred from `project-context.md` presence, and HALTs for a light `[C]` confirmation before proceeding (auto-skipped in worktree mode for `/aped-dev` and `/aped-review` where no human is at the keyboard).
- **Lessons feedback loop closed.** `/aped-story`, `/aped-dev`, and `/aped-review` now discover `{{OUTPUT_DIR}}/lessons.md`, filter entries by `Scope:` matching the skill (`/aped-story | /aped-dev | /aped-review | all`), and apply the rules at runtime: `/aped-story` cites lessons in Discussion Points and adjusts the draft; `/aped-dev` adds them to the Pre-Implementation Checklist and interpolates them into the `epic-{N}-context.md` cache; `/aped-review` augments each specialist's prompt with their scoped lessons so checks are explicit, not advisory.
- **Previous-stories continuity in `/aped-story`.** Discovery loads completed stories of the current epic so the new draft reuses earlier decisions (validation library, schema choices, naming) instead of re-litigating them, and surfaces implicit dependencies between stories of the same epic.
- **`docs/dev/discovery-pattern.md`** — canonical, dev-facing reference for the pattern. Future skill authors copy-paste from it and customise per skill (globs, required prereqs ✱, brownfield bias). Documents why duplicated-inline (no runtime include) was chosen and which Tier-1 skills the pattern applies to.

### Fixed
- **`/aped-arch` now loads `project-context.md`.** Previously it loaded brief + PRD + UX only, so brownfield architecture decisions ran with no awareness of the existing stack documented by `/aped-context`. The Council and pattern decisions now treat the existing tech stack as a hard constraint when present.
- **`/aped-ux` now loads the PRD, brief, and project context.** Prior versions referenced "PRD user journeys", "real content from PRD", "Read relevant FRs for this screen" in their prose without ever loading the PRD at runtime — the skill silently relied on the PRD being in conversation context from a prior turn, which broke as soon as the user resumed UX work in a new session. Result: hallucinated FRs, invented screens, lorem-ipsum-by-another-name. Discovery now loads the PRD as a required prereq (HALT if missing) and grounds every screen, mock data point, and FR reference in the actual document.

### Changed
- **`/aped-context` and `/aped-analyze` are no longer exclusive.** Both descriptions previously said "Not for X — use Y" and the surrounding tooling didn't cross-load. Now `/aped-analyze` discovers `project-context.md` if present and runs in brownfield mode (Discovery rounds reframe as "what's new relative to the existing system"); `/aped-context` is a producer like `/aped-research`, callable independently. Hybrid projects (new feature in a legacy system) benefit from running both.
- **`/aped-review` architecture handling** softened from required to "strongly recommended". Without `architecture.md`, the Pattern Compliance specialist runs in degraded mode (must infer conventions from the codebase) and the user is warned, but review still proceeds — projects that legitimately skip `/aped-arch` are no longer blocked from running review.
- **`epic-{N}-context.md` cache schema.** The compiled cache (re-used across every story in an epic) now includes `project-context.md` (brownfield only) and `Scope: /aped-dev | all` lessons as compilation inputs alongside the existing PRD / architecture / UX / completed-stories / code-patterns sources. Stale-cache detection still uses story-completion mtime — invalidate manually if you edit lessons mid-epic.
- **Setup blocks across pipeline-phase skills** no longer load upstream documents via `state.yaml` paths. `state.yaml` is still read for pipeline status (e.g. "this phase is already done — redo or skip?") but artefact loading is owned by Input Discovery.

### Why
The state-path-only approach worked when users ran every phase in sequence and the model kept everything in conversation context. The moment the user resumed work in a new session — or produced an artefact outside the state-tracked flow (e.g. ran `/aped-context` standalone, hand-edited `docs/aped/lessons.md` after a retro, or dropped a research file into `docs/aped/`) — those artefacts were invisible to downstream skills. The two latent bugs in `/aped-arch` and `/aped-ux` are symptoms of the same root cause: the loading contract was implicit, the prose assumed it had loaded what it referenced, and there was no glob-discovery to catch the gap. The new pattern mirrors how BMAD handles input loading in its `step-01-init.md` files and the precedent `aped-from-ticket` already implemented in the same codebase: discover everything, confirm with the user, load completely, bias the workflow. The `lessons.md` integration was the most extreme symptom — `/aped-retro`'s entire raison d'être (cross-epic learning) had no runtime consumer; this release closes that loop without changing the retro skill itself.

### Migration notes for existing installs
Run `aped-method --update` to pull in the refactored skills, the regenerated `docs/COMMANDS.md`, and the new `docs/dev/discovery-pattern.md`. **No state.yaml schema change. No config schema change. No breaking changes.** Existing projects continue to work — discovery globs find the same artefacts the previous skills loaded via state paths, plus the ones they previously missed (`project-context.md`, `lessons.md`, completed stories of the current epic). Brownfield projects that ran `/aped-context` previously will see their context.md picked up automatically by every subsequent skill from this release onward — no flag, no command change. Projects with an existing `lessons.md` from prior `/aped-retro` runs will start applying those lessons immediately on the next `/aped-story`, `/aped-dev`, or `/aped-review` invocation. If a `lessons.md` entry was written without a `Scope:` line (older retros), it is treated as `Scope: all` and applies to all three skills — review and re-tag if a tighter scope is desired.

## [3.10.1] - 2026-04-25

External-ticket intake. The pipeline assumes every story originates in `/aped-epics`, but real teams pick up tickets that were never planned through APED — production bugs, partner asks, mid-sprint requests. Until now the only on-ramp was `/aped-quick` (no ticket binding) or manual `/aped-story` after hand-editing `epics.md`. This release adds `/aped-from-ticket`, a single-shot bridge that fetches a ticket from the configured `ticket_system`, drafts a project-conformant story, registers it in `state.yaml` (out-of-sprint by default), and optionally comments back on the source ticket. No favourites: provider parity is mandatory — Linear and Jira go via their MCP, GitHub Issues and GitLab Issues via `gh`/`glab` CLIs. `ticket_system: none` is refused early with a clear remediation message.

### Added
- **`/aped-from-ticket <ticket-id-or-url>` — external ticket intake skill.** Reads `ticket_system` from config, verifies the matching toolchain is available (gh/glab CLI for github/gitlab; Linear or Jira/Atlassian MCP for linear/jira), parses bare IDs or full URLs, fetches the ticket, compiles project context (PRD overlap, architecture constraints, UX touchpoints, related existing stories, codebase patterns), drafts the story collaboratively with a ⏸ GATE before writing, persists it under either an `external-tickets` bucket or an auto-matched epic, registers it in `state.yaml` with `source: from_ticket`, and ends with a 3-option handoff prompt (run `/aped-dev` / promote to active sprint / stop). Refuses early on `ticket_system: none` and on host/provider mismatch (URL host doesn't match configured provider). New skill at `src/templates/skills/aped-from-ticket.md`.
- **`from_ticket:` config block** in the installed `.aped/config.yaml`, exposing four namespaces of knobs with documented defaults: `story_placement.{mode, bucket_epic}` (default `ask` + `external-tickets`), `ticket_comment.{enabled, template}` (default `false` — opt-in to avoid noisy notifications), `sprint_integration.auto_add` (default `false` — story registered but kept out of active sprint until explicit promotion), `handoff.after_story` (default `ask`). All keys are optional; the skill falls back to defaults when absent.
- **`/aped-from-ticket` command entry** in the catalog (`src/templates/commands.js`, category `utility`, phase `Intake`). `docs/COMMANDS.md` regenerated via `npm run generate:catalog`.
- **`tests/from-ticket-wiring.test.js` — 3 vitest cases** covering the wiring surface that breaks silently if a typo slips in: (1) `skills()` includes `aped-from-ticket` with placeholders substituted, (2) `commands()` emits a command file pointing at the matching SKILL.md with the right argument-hint, (3) `configFiles()` renders the `from_ticket:` block with all documented defaults at the right indentation.

### Why
The existing on-ramps to the dev flow assume planning happened first: `/aped-epics` produces the story list, `/aped-story` materialises one of them. A ticket dropped on the team mid-sprint had no first-class path — `/aped-quick` ignores ticket binding entirely (no provider sync, no story file in the sprint), and hand-editing `epics.md` to backfill the planning step is friction. `/aped-from-ticket` fills the gap without compromising the planned-flow's guarantees: the new story is registered but explicitly kept out of the active sprint by default, so prioritisation stays an explicit decision; comment-back to the ticket system is opt-in so first-time users aren't surprised by external side effects; provider parity is enforced so users who chose Jira at install don't silently get a "Linear-only" feature.

### Migration notes for existing installs
Run `aped-method --update` to pull in the new skill, command, and `from_ticket:` config block. Existing `.aped/config.yaml` files without the block continue to work — defaults kick in. No state.yaml schema change. No breaking changes. To enable the comment-back to tickets, set `from_ticket.ticket_comment.enabled: true`. Linear and Jira users must have the corresponding MCP configured in their Claude Code session before invoking the skill — it refuses with a remediation message otherwise.

## [3.10.0] - 2026-04-25

Production-readiness pass for parallel sprint mode. A 20-finding audit (P0/P1/P2) against the sprint-mode skills + scripts surfaced state.yaml corruption paths, workflow drift between state and disk, unsafe `--force` defaults, the absence of programmatic verdicts in `/aped-lead`, and — biggest of all — no branch convention for production: story feature branches lived under main, and `/aped-ship` batch-merged them straight into main at the end. Teams running branch protection on main couldn't ship without bypass. This release closes all 20 findings, introduces the **sprint umbrella branch convention** so parallel sprints integrate via one reviewable PR per sprint, and adds the first vitest coverage of the sprint shell scripts.

### Added
- **Sprint umbrella branch convention.** `/aped-sprint` creates `sprint/epic-{N}` from `origin/<base>`, pushes it, and records the name in `state.yaml` at `sprint.umbrella_branch`. Story feature branches are cut from the umbrella (not from base). `/aped-review` opens story PRs with `--base $UMBRELLA`. `/aped-lead`'s `review-done` approval merges the story PR into the umbrella au-fil-de-l'eau (one merge per approval). `/aped-ship` opens the final `gh pr create --base <base> --head sprint/epic-{N}`. Base only ever sees commits via that one PR — compatible with branch protection out of the box.
- **`.aped/scripts/check-auto-approve.sh` — deterministic verdicts for `/aped-lead`.** Subcommands `story-ready | dev-done | review-done`, exit `0` (AUTO) or `1` (ESCALATE + reasons on stderr). Replaces the previous LLM-judged checks. story-ready verifies the story file is committed, ACs follow Given/When/Then, all `depends_on` are done. dev-done checks `.aped/.last-test-exit == 0`, all tasks `[x]`, no HALT logs, clean tree, file list matches git changes via `git-audit.sh`. review-done verifies status `done`, no `aped-blocked-*` label, PR `MERGEABLE`, AND PR `baseRefName == umbrella` (catches PRs accidentally opened against base).
- **`.aped/scripts/check-active-worktrees.sh` — state.yaml ↔ disk reconciliation.** For every story marked `in-progress | review-queued | review` with a non-null `worktree`, verify the path exists. yq-preferred, awk fallback. Exit `1` if drift detected. `/aped-sprint` calls it before computing capacity (so a `rm -rf`'d worktree no longer blocks dispatch slots). `/aped-lead` and `/aped-status` surface the drift with a `✗ MISSING` row.
- **`.aped/scripts/log.sh` — structured audit log.** Appends JSONL events to `.aped/logs/sprint-{YYYY-MM-DD}.jsonl`. Events emitted automatically by `checkin.sh` (post / approve / block / push) and `sprint-dispatch.sh` (worktree_created); skill-driven events for `dispatch_started`, `merge_done`, `pr_recommended`. jq-preferred with defensive shell fallback. Best-effort: never fails the caller.
- **`set-sprint-field` and generic `set-story-field` commands** in `sync-state.sh`. Used for `umbrella_branch`, `ticket_sync_status`, `merged_into_umbrella` bookkeeping without specific commands per field.
- **`archive` action in `checkin.sh`.** Moves `*.jsonl` inboxes to `.aped/checkins/archive/{date}/` so the next sprint starts with empty inboxes (poll latency stays O(active)). Called by `/aped-ship` after a successful PR open.
- **`dev-blocked` checkin kind.** `/aped-dev` posts it before HALT in worktree mode (new dep, 3-failure repeat, ambiguity, missing config), so `/aped-lead` and `/aped-status` see the blocker instead of the worktree silently freezing. `/aped-lead` always ESCALATEs `dev-blocked` (no auto-approve path).
- **`schema_version: 1` in state.yaml** (top-level, mandatory going forward; legacy files missing the field are accepted as version 1 for back-compat). `validate-state.sh` exits 4 on unknown versions to force an explicit migration. `WORKTREE` markers also include `schema_version: 1`.
- **`--plan-only` on `/aped-sprint` and `/aped-ship`.** Runs through Setup → Discovery / Capacity → Proposal / Findings, then STOPS before any mutation. Prints the commands that would have run. Useful for pre-flight inspection on a sensitive sprint.
- **`tests/sprint-scripts.test.js` — 13 vitest cases** covering sync-state, validate-state, check-active-worktrees, check-auto-approve, log, worktree-cleanup. Caught one real bug at PR time (`${arr[@]}` under `set -u` with empty array fails on bash 4) — fixed in 3 spots via `${arr[@]+"${arr[@]}"}`.

### Changed
- **`/aped-ship` rewritten end-to-end.** No longer batch-merges story branches. New flow: load `sprint.umbrella_branch` → Integration Check (every done story merged into the umbrella, both `git branch --merged` and `merged_into_umbrella` flag agree) → Composite Review on `origin/<base>..$UMBRELLA` (secrets / debug / typecheck / lint / db:generate / state.yaml consistency / leftover worktrees) → push umbrella + print `gh pr create --base <base> --head $UMBRELLA` with the composite summary as the PR body. The skill never pushes to base, never mutates the umbrella content.
- **`/aped-lead` review-done handler merges au-fil-de-l'eau.** Per approved `review-done`: flip story status to `done`, `gh pr merge` (squash) into the umbrella, teardown worktree (`workmux merge` if available, else `worktree-cleanup.sh --delete-branch`), set `merged_into_umbrella: true`. On merge failure (conflicts, branch protection, missing approvals), ESCALATE — user resolves on the PR side then re-runs `/aped-lead`. No auto-retry.
- **`sync-state.sh` hardened.** `set -euo pipefail`, `write_atomic` gates the candidate file (non-empty + valid YAML via yq when present) before snapshotting the backup and `mv`-ing. `set_story_field` uses yq for the mutation when available — robust against regex metachars in story keys (`1-2-foo.bar`, `story[v2]`); awk fallback escapes the key via sed before interpolation. New exit code `5` = "candidate failed validation, refused to clobber". Catches the previous failure mode where a buggy awk produced corrupt YAML written "atomically".
- **`checkin.sh push` rewritten.** Accepts `--target <name>` for explicit override; otherwise builds a candidate list (workmux handle from worktree path basename, ticket id, story key) and tries workmux first, tmux as fallback. Refuses ambiguity with exit `3` and the candidate list — never silently picks the first match. Eliminates the class of "approval went to the wrong worktree" bugs.
- **`sprint-dispatch.sh` lock keyed on worktree path** (sanitized via `tr '/ ' '__'`) instead of story key — catches the case where two stories share a `TICKET_ID` and would race on `git worktree add`. Accepts optional `<base-ref>` as the 3rd argument so `/aped-sprint` can branch stories from the umbrella; defaults to `HEAD` for solo / non-sprint mode (back-compat).
- **`worktree-cleanup.sh` refuses `--force` without `--yes-destroy`.** When the clean `git worktree remove` fails, the script dumps `git status --porcelain` + `git stash list` to stderr, then exits `2` with two recovery options (commit/stash, or re-run with `--yes-destroy`). The previous version silently re-ran `--force` on the first failure, which is exactly how `.env` tweaks and unstaged migrations disappear.
- **State.yaml authority is in main, divergence in worktrees is normal.** Each worktree writes its local state.yaml on its feature branch; main's copy is the authoritative one written by `/aped-lead`. `/aped-ship` resolves state.yaml conflicts at merge with `--ours` **by design**, not as a workaround. `/aped-dev` no longer reads "canonical" state.yaml across the project boundary — each worktree owns its local copy. Documented as a Critical Rule across `aped-sprint`, `aped-story`, `aped-dev`, `aped-lead`, `aped-ship`.
- **`/aped-sprint` ticket-system mutations moved AFTER worktree creation.** Previously: assign + transition ticket → `git worktree add` → if worktree fails, ticket left stuck "in progress" with no work. Now: read-only ticket validation pre-dispatch, mutations post-dispatch. On ticket-sync failure the worktree stays healthy; story is marked `ticket_sync_status: failed` and `/aped-lead` offers a retry on its dashboard.
- **`/aped-status` ticket-sync cached 60s** in `.aped/.cache/tickets.json`. A 20-story sprint no longer fires 20 provider API calls on every dashboard render.
- **`/aped-ship` diff sizing uses `--numstat`** (machine-readable, locale-independent) instead of `--shortstat` (English-only, omits "deletions" when zero, broke the previous `awk '{print $4 + $6}'` parse).
- **`/aped-review` Aria visual fallback marks the story file when React Grab MCP is unavailable.** Appends `Visual Review: deferred — React Grab MCP unavailable at <ts>` to the Review Record so `/aped-status` and `/aped-ship` can surface that the visual gate is incomplete. In prod, persistent MCP unavailability is a BLOCKER until explicitly waived.
- **`run-tests.sh` writes `.aped/.last-test-exit`** with the test runner's exit code so `check-auto-approve.sh dev-done` can verify the most recent run passed without re-executing the suite. `set -e` removed from the script (kept `-u`/`pipefail`) so the cache write happens after a failed run too.
- **README requirements explicit:** unix-like shell required (macOS/Linux/WSL; native Windows unsupported). `yq` (mike farah, v4) promoted from "not mentioned" to "strongly recommended" — `sync-state.sh` and `check-active-worktrees.sh` use it as the primary path.

### Why
Sprint mode shipped in 3.8 worked end-to-end but didn't survive an adversarial audit against production usage. Two classes of issue dominated: (1) `state.yaml` writes had a soft "atomic" path that could still emit corrupt YAML if any of `cp`/`awk`/`sed` failed silently, and there was no validation gate before `mv`; the buggy awk would produce malformed YAML and `mv` it over the live file "atomically". (2) The merge story didn't model what production teams actually do — every team using branch protection on main needed a parent branch the story PRs could land in. The umbrella convention (`sprint/epic-{N}`) replaces the previous "merge stories straight into main at /aped-ship time" with the standard prod pattern: stories PR into the umbrella as they're approved by /aped-lead, /aped-ship opens one final PR umbrella → main. Everything else in this release is the audit's tail — programmatic verdicts replace LLM judgement so /aped-lead can't hallucinate a check, the audit log makes postmortems possible, schema versioning makes future bumps fail loud instead of silently breaking projects, and the test suite covers the riskiest scripts so the next refactor isn't roulette.

### Migration notes for existing installs
Run `aped-method --update` to pull in the new skills + scripts. Three behaviour changes show up end-to-end:

1. **In-flight parallel sprints have no `umbrella_branch` field.** Resume by re-running `/aped-sprint` once: the skill creates the umbrella from `origin/<base>` and records it before the next dispatch. No data loss, no manual edit. Stories already dispatched continue to work — they're branched from main, and the umbrella picks them up via the next `/aped-ship` Integration Check (which surfaces the inconsistency and asks you to merge them manually or via /aped-lead).
2. **Story PR target moves from `<base>` to umbrella** in `/aped-review`. Open PRs from earlier sprints can be merged into base directly with `gh pr merge` — leave them. New PRs from `/aped-review` will target the umbrella.
3. **`/aped-ship` no longer merges stories.** It expects `/aped-lead` to have merged them au-fil-de-l'eau into the umbrella. If you skipped `/aped-lead` approval for some done stories, `/aped-ship` will HALT with the list — re-run `/aped-lead` or merge manually before re-running `/aped-ship`.

`yq` (mike farah, v4) is now strongly recommended; the awk fallbacks work but are more fragile. `brew install yq` (macOS) or `snap install yq` (Linux). `jq` stays optional, now used by `log.sh` for safer JSON encoding. Native Windows (cmd / PowerShell without WSL) is explicitly unsupported — see README.

## [3.9.0] - 2026-04-25

Conversational mechanism alignment with BMAD. A user-driven audit of `/aped-brainstorm` exposed that several APED skills had inherited BMAD's structure (techniques, stages, specialist personas) but lost BMAD's actual *conversational mechanism* — the back-and-forth coaching loop that separates a partner from a generator. This release closes that gap across the eight content-generating skills, brings the A/P/C menu pattern (Advanced elicitation / Party / Continue) wherever BMAD uses it, and preserves every existing autonomous workflow via opt-in flags.

### Changed
- **`/aped-brainstorm` Phase 3 fully rewritten — one element at a time, not batches of 10.** The previous behaviour generated 10 ideas per technique batch and asked a rhetorical "any of these spark something?", which the model treated as a no-op and continued cranking through to the 50-100 idea quota. Phase 3 is now an interactive coaching loop: present ONE technique element, ⏸ HALT for the user's response, then react with one of three explicit coaching patterns (basic answer → dig; detailed answer → build with one AI extension on top; stuck → seed with a concrete starting angle). Energy checkpoint every 4-5 exchanges with a [K]eep / [S]witch / [P]ivot / [D]one menu. End of every technique: [K]eep / [T]ry new / [A]dvanced elicit / [B]reak / [C]onverge menu, with explicit HALT. Anti-bias domain pivot still fires automatically every 10 ideas, just inside the new flow. The "NEVER generate ideas in silent batches" rule is now in Critical Rules.
- **`/aped-prd` is interactive by default; `--headless` preserves the previous autonomous behaviour.** The previous skill generated all 4 sections in one shot with no user input, which gave a PRD but never asked the user whether each section reflected intent. New flow: generate Section N (Foundation / Scope / Domain / Requirements), present it, ⏸ HALT with the A/P/C menu — [A]dvanced elicitation invokes `/aped-elicit`; [P]arty/Council dispatches a section-specific sub-team via `Agent` (Mary+Derek for Foundation, a PM for Scope, Raj for Domain, Eva+Marcus for Requirements); [C]ontinue accepts and moves on; direct feedback applies inline. `--headless` skips every menu and produces the PRD straight-through, equivalent to the 3.8 behaviour, for CI/scripted workflows.
- **`/aped-analyze` discovery rounds gain catch-all prompts + final A/C menu.** Each of the 4 rounds (Vision / Users / Constraints / Validation) ends with "Anything else about {topic} you want to mention before we move on?" and a HALT — BMAD's "capture-don't-interrupt" pattern that catches stakeholder constraints and personal anecdotes the structured questions miss. Round 4 closes with an A/C menu: [A] invoke `/aped-elicit` on the discovery summary (Pre-mortem / Devil's Advocate to surface blind spots before research dispatches); [C] accept and dispatch parallel research (Mary / Derek / Tom).
- **`/aped-epics` binary GATE replaced with A/P/C menu.** Previously the user could only validate the epic structure or "request changes" with no structured way to stress-test. New menu: [A] `/aped-elicit` on the decomposition (Tree of Thoughts on alternative groupings; Pre-mortem on sequencing risks); [P] convene a 3-specialist sub-team in parallel — Sam (Fullstack Tech Lead) on story sizing and hidden coupling, Eva (QA Lead) on testability and AC coverage, a PM persona on user-value coherence; [C] accept and write `epics.md` + run coverage validation; direct feedback applies inline.
- **`/aped-arch` Phase 5 final approval gains an A/C menu.** The Architecture Council in Phase 2b already covers the "P" role for major decisions. The new Phase 5 menu provides [A] adversarial pressure on the doc as a whole — `/aped-elicit` with Pre-mortem ("1 year from now this architecture is regretted, why?"), Red Team vs Blue Team on security, Tree of Thoughts on the riskiest decision — before downstream skills (epics / dev / review) treat it as LAW. [C] commits.
- **`/aped-prfaq` Stage 2 Press Release and Stage 4 Internal FAQ gain A/C menus.** Stage 2: [A] `/aped-elicit` (Devil's Advocate on the leader quote; Feynman test for clarity; Mom-test on the customer quote); [C] accept and move to Stage 3. Stage 4 (last gate before Verdict synthesis): [A] `/aped-elicit` (Pre-mortem on 6-month death; Shark Tank Pitch with hostile investor questions; Red Team on the moat answer); [C] synthesise the Verdict.
- **`/aped-retro` Phase 4 action items gain an A/C menu.** Action items are the load-bearing output of the retro — the next epic's success depends on them being real, owned, and time-bound. [A] invokes `/aped-elicit` (Pre-mortem: "next retro hits and these weren't done — why?"; SMART audit; Devil's Advocate: "which 2 of these actually move the needle?"); [C] commits the list and proceeds to Significant Discovery Detection.
- **`/aped-ux` F5 user review cycle gains an A/C menu.** Previously the loop ran "until user says 'approved'", which gave no structured stress-test option. New menu: [A] `/aped-elicit` (Feynman test for clarity; Devil's Advocate on flows; Hindsight: "if a real user breaks this in 30 days, what did we miss?"); [C] commits the prototype, writes the UX spec, updates state.

### Added
- The full A/P/C menu vocabulary is now consistent across the seven gated skills. `[A]` always invokes `/aped-elicit` (the horizontal critique toolkit). `[P]` (where it appears) always dispatches a multi-specialist subagent team via `Agent`. `[C]` always continues. Direct user feedback is always accepted as a fallback. The pattern is paste-able from BMAD step files and matches the user's mental model across the pipeline.

### Why
A user running `/aped-brainstorm` reported that after the framing phase, the model generated technique batches with no real discussion. Reading BMAD's `step-03-technique-execution.md` revealed that BMAD's brainstorming is built around one-element-at-a-time coaching with explicit HALT keywords — the structural mechanism APED's port had silently dropped. Auditing the other content-generating skills against their BMAD originals showed the same pattern: APED kept the goal but lost the path. Where APED specialists existed (Architecture Council, retro Mia/Leo/Ava, review Eva/Marcus/...), they were ahead of BMAD; where APED was generative-only (`/aped-prd`) or used a binary "validate y/n" gate (`/aped-epics`, `/aped-arch`, `/aped-prfaq`, `/aped-retro`, `/aped-ux`), the conversation collapsed into output. This release restores the back-and-forth across the whole pipeline so users get a partner, not a generator.

### Migration notes for existing installs
Run `aped-method --update` to pull in the new skills. No artifacts are touched. All existing autonomous workflows continue to work: `/aped-prd --headless` reproduces the 3.8 behaviour exactly. Interactive runs now HALT at the new A/P/C menus — if a user wants to skip every menu and accept defaults, they can type `[C]` at each prompt; the same workflow as before, just with the option to stop and stress-test at every step. `/aped-brainstorm` behaviour changes most visibly: silent batches of 10 no longer happen — every technique element is now interactive. Tell users running CI/scripted PRD generation to add `--headless` to their `/aped-prd` invocation.

## [3.8.0] - 2026-04-22

Sprint-workflow robustness pass. An adversarial failure-mode audit surfaced seven paths that could leave `state.yaml` corrupted, locks wedged, or sessions out of sync with the pipeline. This release closes the five most impactful ones, adds a state-validation script the sprint skills call at Setup, and teaches `aped-method doctor` to detect and offer one-liner fixes for each of the new failure surfaces.

### Added
- **`.aped/scripts/validate-state.sh` — state.yaml integrity check.** A dependency-free script that verifies the file exists, parses as YAML (when `yq` is available), and that every `status:` value is in the canonical whitelist (`pending`, `ready-for-dev`, `in-progress`, `dev-done`, `review`, `review-queued`, `review-done`, `done`). Called from the Setup section of `/aped-sprint`, `/aped-lead`, `/aped-ship`, and `/aped-course` so a hand-edited or half-corrupted state file produces a clear actionable error instead of silent grep/awk failures downstream. Exits 0 on success, non-zero with a one-line message and a restore hint pointing at the new backup file.
- **`.aped/state.yaml.backup` — one-deep safety net.** Every mutation done through `sync-state.sh` snapshots the current `state.yaml` to this backup location before writing. `doctor` surfaces the backup's presence and offers the one-line `cp` command to restore when the current file becomes unreadable.
- **`doctor` now scans four new failure surfaces.** Orphan `.state.lock` directories older than 300s (previous `sync-state` likely crashed), stale `.sprint-locks/*` entries older than 900s (previous dispatch likely crashed), stuck `scope_change_active: true` with `state.yaml` mtime older than 2h (previous `/aped-course` likely crashed), and backup-vs-state availability when the primary is unreadable. Each check reports a concrete `rm -rf` or `cp` command the user can paste to recover.

### Changed
- **`sync-state.sh` rewritten for atomicity + self-healing locks.** (1) Replaced the Linux-only `flock` with the portable `mkdir` lock used elsewhere in APED; (2) lock timeout dropped from 10s to 5s and stale locks older than `APED_STALE_LOCK_SECONDS` (default 300s) are auto-reclaimed with a clear WARN before the new holder takes over; (3) every mutation goes through write_atomic: temp file → backup current → atomic rename, so a mid-write crash leaves either the old state intact or the new state complete, never a truncated file; (4) expanded the command surface from `set-scope-change` + two NOPs to four real atomic ops: `set-scope-change`, `set-story-status`, `set-story-worktree`, `clear-story-worktree` — skills can now stop hand-rolling sed patches in-skill. Tunable via `APED_STALE_LOCK_SECONDS` and `APED_LOCK_TIMEOUT_SECONDS` env vars.
- **`sprint-dispatch.sh` now acquires a per-story fleet-lock.** Previously, two `/aped-sprint` sessions (two terminals, two checkouts) could race on `git worktree add` for the same story key — the second failed with a cryptic git error and no recovery path. The new lock at `.aped/.sprint-locks/<story-key>` via atomic `mkdir` serialises dispatches per story, auto-reclaims entries older than 900s (worktree creation on large repos can legitimately take minutes), and exits with code 3 and a clear message if a live dispatch is already in progress. Tunable via `APED_SPRINT_LOCK_STALE_SECONDS` and `APED_SPRINT_LOCK_TIMEOUT_SECONDS`.
- **`/aped-course` now detects and auto-clears stuck `scope_change_active` flags.** Previously, if the skill crashed between setting the flag and clearing it at exit, all future scope-change attempts refused to proceed. New Setup step reads `state.yaml`'s mtime: if the flag is set and the file hasn't been touched in more than 2 hours, the skill auto-clears the flag with a clear warning ("Stale scope_change_active cleared from a previous crashed /aped-course run — verify no partial PRD/architecture/UX edits were left behind") and proceeds; if the flag is set and the file was touched within 2h, the skill HALTs and tells the user another session may be active.
- **`/aped-sprint`, `/aped-lead`, `/aped-ship`, `/aped-course` Setup sections now call `validate-state.sh` before reading state.yaml.** All four skills HALT on non-zero exit with the reported error — never auto-repair, always point the user at the backup file. `/aped-ship` in particular treats this as a non-negotiable gate: the last checkpoint before pushing to main must never operate on state of unknown structure.

### Why
APED's parallel-sprint workflow handles the happy path well but the failure audit found that a single crashed skill (OOM, `SIGKILL`, power loss, `Ctrl+C` at the wrong moment) could leave `state.yaml` corrupted with no backup, a lock held forever, or a scope-change flag stuck permanently. Recovery required users to hand-edit YAML in `.aped/`, which they shouldn't have to do. The atomic-write + backup pattern eliminates the corruption path entirely; the stale-lock timers turn "forever stuck" into "blip recoverable"; and `doctor` closes the loop by surfacing any residue after a crash and handing the user the exact shell command to resolve it. Net effect: a crashed skill is now a 2-second inconvenience instead of a sprint-ending data-loss event.

### Migration notes for existing installs
Run `aped-method --update` (or `npx aped-method@3.8.0 --update`) to pull in the new `.aped/scripts/sync-state.sh`, the new `.aped/scripts/validate-state.sh`, the updated `.aped/scripts/sprint-dispatch.sh`, and the refreshed `/aped-sprint`, `/aped-lead`, `/aped-ship`, `/aped-course` skills. No existing artifacts (`state.yaml`, `prd.md`, stories, epics) are touched by this upgrade. First mutation after the upgrade creates the `state.yaml.backup` file automatically. If your project has an existing stale `.aped/.state.lock` or `scope_change_active: true` from a pre-3.8.0 crash, run `aped-method doctor` — it will show the exact shell command to clear each condition. The `sync-state.sh` command surface is backwards-compatible: the previous `set-scope-change` command still works; the new commands (`set-story-status`, `set-story-worktree`, `clear-story-worktree`) are additive.

## [3.7.7] - 2026-04-22

### Added
- **Context-window progress bar in the APED statusline.** The optional statusline now renders `ctx:[█░░░░░░░░░] 126k/1M (13%)` right after the model segment. Reads the last assistant turn's usage from `$transcript_path` (`input_tokens + cache_read_input_tokens + cache_creation_input_tokens` = total context consumed at that turn) and renders a 10-block bar plus absolute + percentage readout. Auto-detects 1M-context models via `[1m]` in `model.id` or "1M context" in `display_name`, otherwise assumes a 200k window. Silent on any missing/malformed transcript — it's advisory, never blocks the line.

### Changed
- **Statusline color palette retuned.** No color is reused on the same line, and each segment's hue hints at its role: model → red (identity anchor), ctx → white (neutral data), project → bright blue, phase → yellow, epic → magenta, story → cyan, review → bright yellow (attention, not error), worktrees → bright magenta, git → green clean / bright red dirty. Brackets around the model name dropped; the red color carries the identity role on its own.

### Migration notes for existing installs
Re-run `aped-method statusline` (or `npx aped-method@3.7.7 statusline`) to refresh `.aped/scripts/statusline.js`. No other APED artifacts change.

## [3.7.6] - 2026-04-22

### Fixed
- **False `SCOPE_CHANGE` warning on fresh scaffolds.** Running `/aped-analyze` (or `/aped-prd`) in a brand-new project — no brief, no PRD, no epics, `current_phase: "none"` — surfaced a phantom "Sprint is active" warning and asked the user to confirm a scope change. The scaffolded `state.yaml` template included a comment documenting the story lifecycle (`# Per-story status: pending → ready-for-dev → in-progress → …`), and the guardrail's `grep 'status:.*\(in-progress\|review\|ready-for-dev\)'` matched that comment instead of real `status: "in-progress"` YAML. Every fresh scaffold tripped the sprint detector.

### Changed
- **Guardrail strips comment lines before scanning `state.yaml`.** `grep -v '^[[:space:]]*#'` is applied first, then the sprint-status match runs against YAML body only. Pattern also tightened from `status:.*<keyword>` to `status:[[:space:]]*"*<keyword>"*` so it only matches actual YAML values (`status: "in-progress"`), not prose that happens to mention the word "status".
- **`state.yaml` template comment reformulated** to `# Per-story status values (ordered): …` — defense in depth so existing installs without the new guardrail also stop tripping the old pattern.

### Migration notes for existing installs
No action required. The new guardrail ignores the old comment, so projects scaffolded with ≤ 3.7.5 stop emitting the phantom warning as soon as `.aped/hooks/guardrail.sh` is updated (via `aped-method --update` or a fresh install). If you prefer to also refresh the `state.yaml` comment, replace the `# Per-story status:` line in your project's `docs/aped/state.yaml` with the 3.7.6 version — cosmetic only.

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
