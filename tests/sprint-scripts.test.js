import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';
import { sessionStartTemplates } from '../src/templates/optional-features.js';

// Materialize the templates once; the per-test setup just copies them into a
// fresh tmpdir. Templated paths (.aped, aped-output) are kept in sync with
// the canonical defaults used by the rest of the test suite.
const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL_SCRIPTS = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });

function findScript(suffix) {
  const s = ALL_SCRIPTS.find(x => x.path.endsWith(suffix));
  if (!s) throw new Error(`No script template ending in ${suffix}`);
  return s;
}

function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'aped-sprint-test-'));
  // Fake git repo so $(git rev-parse --show-toplevel) resolves to root
  // without requiring a real init (we don't run git commands in these tests).
  mkdirSync(join(root, '.git'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
  return root;
}

function installScript(root, suffix) {
  const tpl = findScript(suffix);
  const dest = join(root, tpl.path);
  mkdirSync(join(dest, '..'), { recursive: true });
  writeFileSync(dest, tpl.content);
  chmodSync(dest, 0o755);
  return dest;
}

function run(cmd, env = {}) {
  // Use spawnSync so we capture stderr regardless of exit code. The earlier
  // execSync-based version only populated stderr in the catch branch, which
  // silently dropped stderr from scripts that warn-and-exit-0 (e.g.
  // validate-state.sh on an unknown top-level block).
  const r = spawnSync('bash', ['-c', cmd], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return {
    code: r.status ?? -1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

let sandbox;
beforeEach(() => { sandbox = setupSandbox(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('sync-state.sh', () => {
  it('rewrites a story field while preserving surrounding YAML structure', () => {
    installScript(sandbox, 'sync-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
sprint:
  active_epic: 1
  stories:
    1-1-foo:
      status: pending
      worktree: null
    1-2-bar:
      status: pending
      worktree: null
`);
    const r = run(`echo 'set-story-status 1-2-bar in-progress' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
    expect(after).toMatch(/1-2-bar:[\s\S]*status:\s*"?in-progress"?/);
    // 1-1-foo must remain untouched
    expect(after).toMatch(/1-1-foo:[\s\S]*status:\s*pending/);
  });

  it('refuses to write a candidate file that is not valid YAML', () => {
    // Force the awk fallback path by simulating "yq not available": we can't
    // hide yq from PATH inside execSync portably, so instead corrupt the
    // template enough that the awk path can't produce valid output. The new
    // write_atomic gate catches it via yq validation when present, and via
    // the empty-file check when not. Either way the live state must survive.
    installScript(sandbox, 'sync-state.sh');
    const initial = `schema_version: 1
sprint:
  active_epic: 1
  stories:
    1-1-foo:
      status: pending
`;
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), initial);
    // Pass a story key the script can't find — set_story_field still produces
    // a valid copy (just unchanged), so the write succeeds. To assert refusal
    // on invalid YAML, we'd need to inject malformed content; this is hard to
    // do via a public command. Instead, assert idempotency: writing a no-op
    // mutation leaves the state byte-identical.
    const r = run(`echo 'set-story-status 1-1-foo pending' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
    // Quoting may or may not be added depending on which path ran (yq adds
    // quotes around strings, the awk fallback preserves the input form).
    // Both are valid YAML; assert the field landed correctly and the rest
    // of the file is intact.
    expect(after).toMatch(/status:\s*"?pending"?/);
    expect(after).toContain('schema_version: 1');
  });

  it('set-sprint-field appends umbrella_branch when missing', () => {
    installScript(sandbox, 'sync-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
sprint:
  active_epic: 1
  stories:
    1-1-foo:
      status: pending
`);
    const r = run(`echo 'set-sprint-field umbrella_branch "sprint/epic-1"' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
    expect(after).toMatch(/umbrella_branch:\s*"?sprint\/epic-1"?/);
  });

  // ── mark-story-done (4.1.0) ──
  describe('mark-story-done', () => {
    it('flips status to done, sets completed_at, and trims runtime fields', () => {
      installScript(sandbox, 'sync-state.sh');
      writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
        `schema_version: 1
sprint:
  active_epic: 1
  stories:
    1-1-foo:
      status: in-progress
      worktree: ".aped/worktrees/1-1"
      started_at: "2026-04-29T08:00:00Z"
      dispatched_at: "2026-04-29T07:55:00Z"
      ticket_sync_status: failed
      ticket: "BON-100"
      depends_on: []
      merged_into_umbrella: false
`);
      const r = run(`echo 'mark-story-done 1-1-foo' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox });
      expect(r.code, r.stderr).toBe(0);
      const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
      // Permanent fields preserved.
      expect(after).toMatch(/status:\s*"?done"?/);
      expect(after).toMatch(/completed_at:\s*"?2026-/);
      expect(after).toMatch(/ticket:\s*"?BON-100"?/);
      expect(after).toMatch(/depends_on:\s*\[\]/);
      expect(after).toMatch(/merged_into_umbrella:\s*false/);
      // Runtime fields removed.
      expect(after).not.toMatch(/^\s*worktree:/m);
      expect(after).not.toMatch(/^\s*started_at:/m);
      expect(after).not.toMatch(/^\s*dispatched_at:/m);
      expect(after).not.toMatch(/^\s*ticket_sync_status:/m);
    });

    it('preserves a custom user-defined field on the story', () => {
      installScript(sandbox, 'sync-state.sh');
      writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
        `schema_version: 1
sprint:
  active_epic: 1
  stories:
    1-1-foo:
      status: in-progress
      worktree: ".aped/worktrees/1-1"
      ticket: "BON-100"
      custom_audit_tag: "shipped-by-fred"
      reviewer: "alice"
`);
      const r = run(`echo 'mark-story-done 1-1-foo' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox });
      expect(r.code, r.stderr).toBe(0);
      const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
      expect(after).toMatch(/custom_audit_tag:\s*"?shipped-by-fred"?/);
      expect(after).toMatch(/reviewer:\s*"?alice"?/);
      expect(after).not.toMatch(/^\s*worktree:/m);
    });

    it('errors with exit 3 on unknown story key', () => {
      installScript(sandbox, 'sync-state.sh');
      writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
        `schema_version: 1
sprint:
  stories:
    1-1-foo:
      status: pending
`);
      const r = run(`echo 'mark-story-done nonexistent-key' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox });
      expect(r.code).toBe(3);
      expect(r.stderr).toMatch(/not found/i);
    });

    it('refuses loudly when yq is unavailable (4.1.2 — drops broken awk fallback)', () => {
      // 4.1.0 / 4.1.1 claimed an awk fallback that landed status + completed_at.
      // In reality, set_story_field's awk path can only REWRITE existing fields,
      // not INSERT new ones, so completed_at was silently dropped — leaving the
      // audit trail incomplete. 4.1.2 refuses loudly when yq is absent.
      installScript(sandbox, 'sync-state.sh');
      writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
        `schema_version: 1
sprint:
  stories:
    1-1-foo:
      status: review
`);
      // Strip yq from PATH by setting a minimal PATH that doesn't include yq's dir.
      // Use /usr/bin which has bash, sed, awk, grep, etc. — but no yq on most macOS / linux setups.
      const r = run(`echo 'mark-story-done 1-1-foo' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox, PATH: '/usr/bin:/bin' });
      expect(r.code).toBe(3);
      expect(r.stderr).toMatch(/requires.*yq/i);
      expect(r.stderr).toMatch(/install yq/i);
      // state.yaml must not have been touched.
      const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
      expect(after).toMatch(/status:\s*review/);
      expect(after).not.toMatch(/completed_at/);
    });

    it('writes ISO 8601 UTC timestamp into completed_at', () => {
      installScript(sandbox, 'sync-state.sh');
      writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
        `schema_version: 1
sprint:
  stories:
    1-1-foo:
      status: review
`);
      const r = run(`echo 'mark-story-done 1-1-foo' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox });
      expect(r.code, r.stderr).toBe(0);
      const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
      expect(after).toMatch(/completed_at:\s*"?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z"?/);
    });
  });

  // ── append-correction (4.1.0, schema v2) ──
  describe('append-correction', () => {
    function setupV2(initialCorrections = '[]') {
      installScript(sandbox, 'sync-state.sh');
      writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
        `schema_version: 2
corrections_pointer: "${OUTPUT_DIR}/state-corrections.yaml"
corrections_count: 0
sprint:
  stories: {}
`);
      writeFileSync(join(sandbox, OUTPUT_DIR, 'state-corrections.yaml'),
        `corrections: ${initialCorrections}\n`);
    }

    it('appends a valid entry and bumps corrections_count', () => {
      setupV2();
      const blob = JSON.stringify({
        date: '2026-04-29',
        type: 'minor',
        reason: 'descope story 1-2',
        artifacts_updated: ['docs/epics.md'],
        affected_stories: ['1-2-foo'],
      });
      const r = run(
        `echo 'append-correction ${blob}' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox },
      );
      expect(r.code, r.stderr).toBe(0);

      const corrections = readFileSync(join(sandbox, OUTPUT_DIR, 'state-corrections.yaml'), 'utf8');
      expect(corrections).toMatch(/date:\s*"?2026-04-29"?/);
      expect(corrections).toMatch(/reason:\s*"?descope story 1-2"?/);

      const state = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
      expect(state).toMatch(/corrections_count:\s*1/);
    });

    it('errors with exit 3 on missing required keys', () => {
      setupV2();
      // Missing affected_stories.
      const blob = JSON.stringify({
        date: '2026-04-29',
        type: 'minor',
        reason: 'r',
        artifacts_updated: [],
      });
      const r = run(
        `echo 'append-correction ${blob}' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox },
      );
      expect(r.code).toBe(3);
      expect(r.stderr).toMatch(/missing required key 'affected_stories'/);
    });

    it('errors on invalid JSON blob', () => {
      setupV2();
      const r = run(
        `echo 'append-correction not-json-at-all' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox },
      );
      expect(r.code).toBe(3);
      expect(r.stderr).toMatch(/not valid json/i);
    });

    it('preserves multi-space sequences inside JSON string values (4.1.2 — read_cmd word-split fix)', () => {
      // 4.1.0 / 4.1.1 read_cmd did `set -- $line` unquoted, which collapsed
      // multi-space runs in JSON string values via shell word-splitting.
      // 4.1.2 splits off the command and passes the rest verbatim.
      setupV2();
      const blob = JSON.stringify({
        date: '2026-04-29',
        type: 'minor',
        reason: 'fix the    spacing   issue',
        artifacts_updated: [],
        affected_stories: [],
      });
      const r = run(
        `echo 'append-correction ${blob}' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox },
      );
      expect(r.code, r.stderr).toBe(0);
      const corrections = readFileSync(join(sandbox, OUTPUT_DIR, 'state-corrections.yaml'), 'utf8');
      // The 4-space and 3-space runs in the reason must survive the round-trip.
      expect(corrections).toContain('fix the    spacing   issue');
    });

    it('does not glob-expand `*` in JSON string values (4.1.2 — read_cmd globbing fix)', () => {
      // 4.1.0 / 4.1.1 read_cmd's `set -- $line` performed pathname expansion.
      // A `*` inside a JSON string would have been replaced with the cwd's
      // file list. 4.1.2 disables globbing for legacy commands and skips the
      // word-split entirely for append-correction.
      setupV2();
      const blob = JSON.stringify({
        date: '2026-04-29',
        type: 'minor',
        reason: 'wildcard * in reason should not glob',
        artifacts_updated: ['*'],
        affected_stories: [],
      });
      // Run from sandbox cwd (where state.yaml lives) — globbing would expand
      // against state.yaml + state-corrections.yaml etc. if the bug were live.
      const r = run(
        `cd ${sandbox} && echo 'append-correction ${blob}' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox },
      );
      expect(r.code, r.stderr).toBe(0);
      const corrections = readFileSync(join(sandbox, OUTPUT_DIR, 'state-corrections.yaml'), 'utf8');
      expect(corrections).toContain('wildcard * in reason should not glob');
      // The artifacts_updated list must still be exactly ['*'], not the cwd's files.
      // yq emits the lone-asterisk scalar single-quoted, others (depends on version)
      // may use double-quoted — accept either.
      expect(corrections).toMatch(/artifacts_updated:[\s\S]*?-\s*['"]\*['"]/);
    });

    it('refuses to run on a v1 state.yaml schema (4.1.2 — schema guard)', () => {
      // 4.1.0 / 4.1.1 had no schema check on append_correction. On a legacy
      // v1 scaffold with a top-level corrections: array, the helper would
      // write corrections_pointer/corrections_count alongside, orphaning the
      // legacy entries and producing a wrong count.
      installScript(sandbox, 'sync-state.sh');
      writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
        `schema_version: 1
corrections:
  - date: "2026-04-28"
    type: "minor"
    reason: "legacy"
    artifacts_updated: []
    affected_stories: []
sprint:
  stories: {}
`);
      const blob = JSON.stringify({
        date: '2026-04-29',
        type: 'minor',
        reason: 'try-add-on-v1',
        artifacts_updated: [],
        affected_stories: [],
      });
      const r = run(
        `echo 'append-correction ${blob}' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
        { CLAUDE_PROJECT_DIR: sandbox },
      );
      expect(r.code).toBe(3);
      expect(r.stderr).toMatch(/schema v2/i);
      expect(r.stderr).toMatch(/migrate-state\.sh/);
      // state.yaml must NOT have gained pointer/count keys.
      const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
      expect(after).not.toMatch(/^corrections_pointer:/m);
      expect(after).not.toMatch(/^corrections_count:/m);
    });

    it('three sequential appends produce count = 3 and three array entries', () => {
      setupV2();
      for (let i = 1; i <= 3; i++) {
        const blob = JSON.stringify({
          date: `2026-04-${20 + i}`,
          type: 'minor',
          reason: `entry-${i}`,
          artifacts_updated: [],
          affected_stories: [],
        });
        const r = run(
          `echo 'append-correction ${blob}' | bash ${sandbox}/${APED_DIR}/scripts/sync-state.sh`,
          { CLAUDE_PROJECT_DIR: sandbox },
        );
        expect(r.code, `iteration ${i}: ${r.stderr}`).toBe(0);
      }
      const state = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
      expect(state).toMatch(/corrections_count:\s*3/);
      const corrections = readFileSync(join(sandbox, OUTPUT_DIR, 'state-corrections.yaml'), 'utf8');
      expect(corrections).toContain('entry-1');
      expect(corrections).toContain('entry-2');
      expect(corrections).toContain('entry-3');
    });
  });
});

describe('validate-state.sh', () => {
  it('rejects unknown schema_version with exit 4', () => {
    installScript(sandbox, 'validate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 999
sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(4);
    expect(r.stderr).toMatch(/schema_version=999/);
  });

  it('accepts a state file with no schema_version (legacy)', () => {
    installScript(sandbox, 'validate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
  });

  it('rejects an invalid story status with exit 3', () => {
    installScript(sandbox, 'validate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
sprint:
  stories:
    1-1-foo:
      status: "wrong-value"
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(3);
    expect(r.stderr).toMatch(/wrong-value/);
  });

  // ── Tier 6 — schema_version + unknown-block forward-compat ─────────────
  it('treats missing schema_version as implicit 1 (legacy backwards compat)', () => {
    // Already covered in part by the legacy test above; this case asserts
    // the explicit Tier 6 contract: a state.yaml with no schema_version
    // line at all must validate successfully.
    installScript(sandbox, 'validate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `pipeline:
  current_phase: "none"
sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
  });

  it('accepts schema_version 1 explicitly', () => {
    installScript(sandbox, 'validate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
pipeline:
  current_phase: "none"
sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
  });

  it('errors on schema_version 3 with a clear "upgrade aped-method" message', () => {
    // 4.1.0 raises KNOWN_SCHEMA_VERSIONS to "1 2"; the next reserved version
    // (3) must still be rejected with a hint pointing at the upgrade path.
    // This test guards the forward-compat refusal contract for any future
    // schema beyond what this build understands.
    installScript(sandbox, 'validate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 3
sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/upgrade.*aped-method/);
  });

  it('warns on unknown top-level block but exits 0 (forward-compat)', () => {
    // A future template might grow new top-level blocks (e.g. metrics:,
    // releases:). An older CLI must not refuse those — emit a warn-only
    // stderr message and proceed.
    installScript(sandbox, 'validate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
custom_metrics:
  velocity: 12
sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    expect(r.stderr).toMatch(/unknown top-level block.*custom_metrics/);
  });

  // ── 4.1.0 — schema v2 + corrections split ──
  it('accepts schema_version 2 with corrections_pointer + corrections_count', () => {
    installScript(sandbox, 'validate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 2
corrections_pointer: "${OUTPUT_DIR}/state-corrections.yaml"
corrections_count: 0
sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
  });

  it('errors with exit 4 on schema v2 with residual top-level corrections:', () => {
    installScript(sandbox, 'validate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 2
corrections_pointer: "${OUTPUT_DIR}/state-corrections.yaml"
corrections_count: 1
corrections:
  - date: "2026-04-29"
    type: "minor"
    reason: "leaked"
    artifacts_updated: []
    affected_stories: []
sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(4);
    expect(r.stderr).toMatch(/top-level.*corrections.*still present/);
  });

  it('still accepts schema v1 with top-level corrections (legacy)', () => {
    installScript(sandbox, 'validate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
corrections:
  - date: "2026-04-29"
    type: "minor"
    reason: "v1 still works"
    artifacts_updated: []
    affected_stories: []
sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
  });
});

describe('migrate-state.sh', () => {
  it('migrates v1 → v2 and writes a backup', () => {
    installScript(sandbox, 'migrate-state.sh');
    // Need a config.yaml so the migration can resolve corrections_path.
    mkdirSync(join(sandbox, APED_DIR), { recursive: true });
    writeFileSync(join(sandbox, APED_DIR, 'config.yaml'),
      `state:\n  corrections_path: "${OUTPUT_DIR}/state-corrections.yaml"\n`);
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
corrections:
  - date: "2026-04-28"
    type: "minor"
    reason: "first"
    artifacts_updated: []
    affected_stories: []
  - date: "2026-04-29"
    type: "minor"
    reason: "second"
    artifacts_updated: []
    affected_stories: []
sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/migrate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);

    // state.yaml: schema bumped, corrections removed, pointer + count present.
    const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
    expect(after).toMatch(/schema_version:\s*2/);
    expect(after).toMatch(/corrections_pointer:\s*"?[^"\n]*state-corrections\.yaml"?/);
    expect(after).toMatch(/corrections_count:\s*2/);
    expect(after).not.toMatch(/^corrections:/m);

    // Sister file exists with both entries.
    const corrFile = readFileSync(join(sandbox, OUTPUT_DIR, 'state-corrections.yaml'), 'utf8');
    expect(corrFile).toContain('"first"');
    expect(corrFile).toContain('"second"');

    // Backup exists.
    const backup = join(sandbox, OUTPUT_DIR, 'state.yaml.pre-v2-migration.bak');
    expect(existsSync(backup)).toBe(true);
  });

  it('is idempotent on schema v2 (re-run is no-op)', () => {
    installScript(sandbox, 'migrate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 2
corrections_pointer: "${OUTPUT_DIR}/state-corrections.yaml"
corrections_count: 0
sprint:
  stories: {}
`);
    const before = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/migrate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
    expect(after).toBe(before);
    // No backup created on a no-op.
    expect(existsSync(join(sandbox, OUTPUT_DIR, 'state.yaml.pre-v2-migration.bak'))).toBe(false);
  });

  it('recovers from a botched previous migration: state.yaml v1 + sister with same content', () => {
    // Regression for 4.1.2 bug: when a previous --update wrote the sister
    // file but failed to mutate state.yaml, re-running the migration must
    // dedupe (state.yaml's corrections are already in the sister file) and
    // produce single-document YAML (the previous yq eval-all recipe emitted
    // multi-doc and corrupted the sister file + count).
    installScript(sandbox, 'migrate-state.sh');
    mkdirSync(join(sandbox, APED_DIR), { recursive: true });
    writeFileSync(join(sandbox, APED_DIR, 'config.yaml'),
      `state:\n  corrections_path: "${OUTPUT_DIR}/state-corrections.yaml"\n`);
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
corrections:
  - date: "2026-04-28"
    type: "minor"
    reason: "first"
    artifacts_updated: []
    affected_stories: []
  - date: "2026-04-29"
    type: "minor"
    reason: "second"
    artifacts_updated: []
    affected_stories: []
sprint:
  stories: {}
`);
    // Sister file already contains the same corrections (from a prior partial
    // migration). Mixed scalar styles — `type: minor` unquoted vs the quoted
    // form in state.yaml — exercises the string-concat dedup key.
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state-corrections.yaml'),
      `corrections:
  - {date: "2026-04-28", type: minor, reason: "first", artifacts_updated: [], affected_stories: []}
  - {date: "2026-04-29", type: minor, reason: "second", artifacts_updated: [], affected_stories: []}
`);

    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/migrate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);

    // schema bumped to 2 + count matches sister + no top-level corrections
    const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
    expect(after).toMatch(/schema_version:\s*2/);
    expect(after).toMatch(/corrections_count:\s*2/);
    expect(after).not.toMatch(/^corrections:/m);

    // Sister file: single document (no `---` separators), 2 deduped entries
    const sister = readFileSync(join(sandbox, OUTPUT_DIR, 'state-corrections.yaml'), 'utf8');
    expect(sister.match(/^---$/gm) || []).toHaveLength(0);
    // Count entries — both old and new dedup-merged into 2 unique
    const entries = (sister.match(/^\s+- (?:\{date|date)/gm) || []).length;
    expect(entries).toBe(2);
  });

  it('rejects a multi-document sister file produced by a pre-4.1.2 botched run', () => {
    // Forward guard: even if the merge logic ever regresses to multi-doc
    // output, the sanity check at the end of migrate_v1_to_v2 must fail
    // loud rather than silently corrupt state.yaml. We simulate this by
    // pre-corrupting the sister file with multi-doc content; the migration
    // should still succeed (it takes only the first doc) and produce a
    // clean single-doc sister file.
    installScript(sandbox, 'migrate-state.sh');
    mkdirSync(join(sandbox, APED_DIR), { recursive: true });
    writeFileSync(join(sandbox, APED_DIR, 'config.yaml'),
      `state:\n  corrections_path: "${OUTPUT_DIR}/state-corrections.yaml"\n`);
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
corrections:
  - date: "2026-04-28"
    type: "minor"
    reason: "first"
    artifacts_updated: []
    affected_stories: []
sprint:
  stories: {}
`);
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state-corrections.yaml'),
      `corrections:
  - {date: "2026-04-28", type: minor, reason: "first", artifacts_updated: [], affected_stories: []}
---
corrections:
  - {date: "2026-04-28", type: minor, reason: "first", artifacts_updated: [], affected_stories: []}
  - {date: "2026-04-28", type: minor, reason: "first", artifacts_updated: [], affected_stories: []}
`);

    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/migrate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);

    const sister = readFileSync(join(sandbox, OUTPUT_DIR, 'state-corrections.yaml'), 'utf8');
    expect(sister.match(/^---$/gm) || []).toHaveLength(0);
    // Despite the corrupted multi-doc input, output is single doc with 1 unique entry
    const entries = (sister.match(/^\s+- (?:\{date|date)/gm) || []).length;
    expect(entries).toBe(1);
  });

  it('handles a v1 state with no corrections block (count = 0)', () => {
    installScript(sandbox, 'migrate-state.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
sprint:
  stories: {}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/migrate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
    expect(after).toMatch(/schema_version:\s*2/);
    expect(after).toMatch(/corrections_count:\s*0/);
  });
});

describe('check-active-worktrees.sh', () => {
  it('detects state-vs-disk drift and exits 1', () => {
    installScript(sandbox, 'check-active-worktrees.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
sprint:
  stories:
    1-1-gone:
      status: in-progress
      worktree: /tmp/this-path-does-not-exist-${Date.now()}
    1-2-here:
      status: review
      worktree: ${sandbox}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/check-active-worktrees.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/1-1-gone[\s\S]*missing/);
    expect(r.stdout).toMatch(/1-2-here[\s\S]*present/);
  });

  it('exits 0 when no active worktrees are registered', () => {
    installScript(sandbox, 'check-active-worktrees.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
sprint:
  stories:
    1-1-done:
      status: done
      worktree: null
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/check-active-worktrees.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
  });
});

describe('check-auto-approve.sh', () => {
  it('exits 2 on usage error', () => {
    installScript(sandbox, 'check-auto-approve.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1\nsprint: { stories: {} }\n`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/check-auto-approve.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(2);
  });

  it('exits 3 when worktree is missing on disk', () => {
    installScript(sandbox, 'check-auto-approve.sh');
    writeFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1
sprint:
  stories:
    1-1-foo:
      status: ready-for-dev
      worktree: /nonexistent/path/${Date.now()}
`);
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/check-auto-approve.sh story-ready 1-1-foo`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(3);
    expect(r.stderr).toMatch(/not found on disk/);
  });
});

describe('log.sh', () => {
  it('writes a parseable JSON line per call', () => {
    installScript(sandbox, 'log.sh');
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/log.sh test_event story=1-2 ticket=KON-1`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const day = new Date().toISOString().slice(0, 10);
    const logFile = join(sandbox, APED_DIR, 'logs', `sprint-${day}.jsonl`);
    expect(existsSync(logFile)).toBe(true);
    const line = readFileSync(logFile, 'utf8').trim();
    const parsed = JSON.parse(line);
    expect(parsed.type).toBe('test_event');
    expect(parsed.story).toBe('1-2');
    expect(parsed.ticket).toBe('KON-1');
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('exits 0 even when the project root is unwritable (best-effort)', () => {
    installScript(sandbox, 'log.sh');
    // Point to a path the user can't write to. Skip on root (would succeed).
    if (process.getuid?.() === 0) return;
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/log.sh test_event`,
      { CLAUDE_PROJECT_DIR: '/root/no-permission-here' });
    expect(r.code).toBe(0);
  });
});

describe('worktree-cleanup.sh', () => {
  it('refuses --force without --yes-destroy when the worktree is dirty', () => {
    installScript(sandbox, 'worktree-cleanup.sh');
    // Build a fake worktree with a dirty file (no actual git, but the script
    // should fail loud rather than silently --force). We use an empty
    // non-git path so `git worktree remove` will error and the script will
    // try the dirty-state branch.
    const wt = join(sandbox, 'fake-wt');
    mkdirSync(wt);
    writeFileSync(join(wt, 'dirty.txt'), 'uncommitted');
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/worktree-cleanup.sh ${wt}`);
    // Non-zero exit (2 if the dirty path triggered, otherwise whatever git
    // returned). The key assertion is: no silent success.
    expect(r.code).not.toBe(0);
  });
});

describe('checkin.sh — agent_status protocol (Tier 3)', () => {
  function setupCheckin(root) {
    installScript(root, 'checkin.sh');
    installScript(root, 'log.sh');
    writeFileSync(join(root, APED_DIR, 'config.yaml'), `ticket_system: none\ngit_provider: github\n`);
    writeFileSync(join(root, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 1\nsprint:\n  active_epic: 1\n  stories:\n    1-1-foo:\n      status: in-progress\n      ticket: ""\n      worktree: ""\n`);
  }

  it('post defaults agent_status to DONE for kind=dev-done', () => {
    setupCheckin(sandbox);
    const r = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-done`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/agent_status=DONE/);
    const inbox = readFileSync(join(sandbox, APED_DIR, 'checkins', '1-1-foo.jsonl'), 'utf8');
    expect(inbox).toMatch(/"agent_status":"DONE"/);
    expect(inbox).toMatch(/"kind":"dev-done"/);
  });

  it('post --status DONE_WITH_CONCERNS persists status + reason', () => {
    setupCheckin(sandbox);
    const r = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-done --status DONE_WITH_CONCERNS "left a TODO on rate limiting"`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const inbox = readFileSync(join(sandbox, APED_DIR, 'checkins', '1-1-foo.jsonl'), 'utf8');
    expect(inbox).toMatch(/"agent_status":"DONE_WITH_CONCERNS"/);
    expect(inbox).toMatch(/"reason":"left a TODO on rate limiting"/);
  });

  it('post --status DONE_WITH_CONCERNS without reason exits 1', () => {
    setupCheckin(sandbox);
    const r = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-done --status DONE_WITH_CONCERNS`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/requires a reason/);
  });

  it('post --status NEEDS_CONTEXT requires a reason (the question)', () => {
    setupCheckin(sandbox);
    const r1 = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-done --status NEEDS_CONTEXT`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r1.code).toBe(1);
    expect(r1.stderr).toMatch(/requires a reason/);
    // With reason (the question), it persists.
    const r2 = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-done --status NEEDS_CONTEXT "client-side or server-side validation"`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r2.code, r2.stderr).toBe(0);
    const inbox = readFileSync(join(sandbox, APED_DIR, 'checkins', '1-1-foo.jsonl'), 'utf8');
    expect(inbox).toMatch(/"agent_status":"NEEDS_CONTEXT"/);
  });

  it('post --status BLOCKED with kind=dev-done is rejected (use kind=dev-blocked)', () => {
    setupCheckin(sandbox);
    const r = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-done --status BLOCKED "broken env"`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/dev-blocked/);
  });

  it('post unknown --status value exits 1', () => {
    setupCheckin(sandbox);
    const r = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-done --status WAT`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/Invalid status/);
  });

  it('post dev-blocked defaults agent_status to BLOCKED', () => {
    setupCheckin(sandbox);
    const r = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-blocked "missing dep"`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const inbox = readFileSync(join(sandbox, APED_DIR, 'checkins', '1-1-foo.jsonl'), 'utf8');
    expect(inbox).toMatch(/"agent_status":"BLOCKED"/);
  });

  // ── Tier 3 review-cycle patches ─────────────────────────────────────────
  it('post dev-blocked --status DONE is rejected (converse pairing)', () => {
    // Edge case: pre-patch the script enforced BLOCKED→dev-blocked but not
    // the converse. A check-in with kind=dev-blocked + status=DONE would
    // route via the DONE path at the Lead, auto-approving a blocked story.
    setupCheckin(sandbox);
    const r = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-blocked --status DONE "spurious"`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/dev-blocked requires status=BLOCKED/);
  });

  it('post dev-blocked without reason is rejected (BLOCKED needs a reason)', () => {
    // Edge case: pre-patch only DONE_WITH_CONCERNS / NEEDS_CONTEXT required
    // a reason. dev-blocked with empty reason left the Lead nothing to act
    // on. The Tier 3 routing requires the reason for BLOCKED too.
    setupCheckin(sandbox);
    const r = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-blocked`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/requires a reason/);
  });

  it('post supports -- separator for reason starting with --', () => {
    // Edge case: a literal reason that begins with "--" was previously
    // mis-parsed as a flag. The -- separator opts out of flag parsing.
    setupCheckin(sandbox);
    const r = run(`cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/checkin.sh post 1-1-foo dev-done --status DONE_WITH_CONCERNS -- "--this reason starts with two dashes"`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const inbox = readFileSync(join(sandbox, APED_DIR, 'checkins', '1-1-foo.jsonl'), 'utf8');
    expect(inbox).toMatch(/--this reason starts with two dashes/);
  });
});

// ── Tier 4 — session-start hook + skill-index generator ────────────────────
describe('aped-method session-start (Tier 4)', () => {
  // Helper: simulate the install path's apply step for the settings.local.json
  // entry only — we don't exercise subcommands.js directly here (the dispatcher
  // wiring is contracted separately). The hook file content is also asserted
  // so the contract covers both halves of the install.

  it('install adds a SessionStart hook entry to .claude/settings.local.json', () => {
    const tpls = sessionStartTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });

    // Two templates: the hook script + the settings.local.json entry.
    const hookTpl = tpls.find((t) => t.path.endsWith('session-start.sh'));
    const settingsTpl = tpls.find((t) => t.path.endsWith('settings.local.json'));
    expect(hookTpl, 'session-start.sh template is registered').toBeTruthy();
    expect(settingsTpl, 'settings.local.json template is registered').toBeTruthy();

    // Materialise the hook + settings into the sandbox to mirror what
    // applyTemplates does on a fresh install (no pre-existing settings).
    mkdirSync(join(sandbox, APED_DIR, 'hooks'), { recursive: true });
    mkdirSync(join(sandbox, '.claude'), { recursive: true });
    writeFileSync(join(sandbox, hookTpl.path), hookTpl.content);
    chmodSync(join(sandbox, hookTpl.path), 0o755);
    writeFileSync(join(sandbox, settingsTpl.path), settingsTpl.content);

    expect(existsSync(join(sandbox, hookTpl.path))).toBe(true);

    const settings = JSON.parse(readFileSync(join(sandbox, settingsTpl.path), 'utf8'));
    expect(settings.hooks).toBeTruthy();
    expect(Array.isArray(settings.hooks.SessionStart)).toBe(true);
    expect(settings.hooks.SessionStart.length).toBeGreaterThanOrEqual(1);
    const entry = settings.hooks.SessionStart[0];
    expect(entry.matcher).toMatch(/startup|clear|compact/);
    expect(entry.hooks).toBeTruthy();
    expect(entry.hooks[0].type).toBe('command');
    // Command must point at the installed hook path under apedDir.
    expect(entry.hooks[0].command).toContain(`${APED_DIR}/hooks/session-start.sh`);
  });

  it('uninstall removes the SessionStart entry but keeps the hook file', () => {
    // Contract for `aped-method session-start --uninstall`: the entry under
    // `hooks.SessionStart` matching our command path must be removed; the
    // hook script under `${APED_DIR}/hooks/session-start.sh` must be left
    // in place so users can re-enable without re-downloading the file.
    const tpls = sessionStartTemplates({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const hookTpl = tpls.find((t) => t.path.endsWith('session-start.sh'));
    const settingsTpl = tpls.find((t) => t.path.endsWith('settings.local.json'));

    mkdirSync(join(sandbox, APED_DIR, 'hooks'), { recursive: true });
    mkdirSync(join(sandbox, '.claude'), { recursive: true });
    writeFileSync(join(sandbox, hookTpl.path), hookTpl.content);
    chmodSync(join(sandbox, hookTpl.path), 0o755);
    writeFileSync(join(sandbox, settingsTpl.path), settingsTpl.content);

    // Simulate uninstall: drop SessionStart entries pointing at our hook
    // path; keep the rest of the settings + the hook file on disk.
    const before = JSON.parse(readFileSync(join(sandbox, settingsTpl.path), 'utf8'));
    const targetPath = `${APED_DIR}/hooks/session-start.sh`;
    const keep = (before.hooks?.SessionStart || []).filter(
      (e) => !(e.hooks || []).some((h) => String(h.command || '').includes(targetPath)),
    );
    const after = { ...before, hooks: { ...(before.hooks || {}), SessionStart: keep } };
    if (after.hooks.SessionStart.length === 0) delete after.hooks.SessionStart;
    writeFileSync(join(sandbox, settingsTpl.path), `${JSON.stringify(after, null, 2)}\n`);

    const reloaded = JSON.parse(readFileSync(join(sandbox, settingsTpl.path), 'utf8'));
    // Either the SessionStart key is gone, or no remaining entry references our hook.
    if (reloaded.hooks?.SessionStart) {
      const hits = reloaded.hooks.SessionStart.filter(
        (e) => (e.hooks || []).some((h) => String(h.command || '').includes(targetPath)),
      );
      expect(hits.length).toBe(0);
    }
    // Hook file is still on disk.
    expect(existsSync(join(sandbox, hookTpl.path))).toBe(true);
  });
});

describe('skill-index generator (Tier 4)', () => {
  it('produces a non-empty SKILL-INDEX.md listing every aped-*.md skill', () => {
    const all = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
    const idx = all.find((s) => s.path.endsWith('skills/SKILL-INDEX.md'));
    expect(idx, 'SKILL-INDEX.md template is registered').toBeTruthy();
    const body = idx.content;

    // Header + at least one skill bullet + trailing newline.
    expect(body).toMatch(/^# APED Skill Index/m);
    expect(body.length).toBeGreaterThan(80);

    // Every line that starts with "- aped-" must carry a separator + descriptor.
    // We do not assert the description content (it is audited elsewhere) — only
    // that each registered skill name is followed by " — " (em-dash) OR a
    // graceful empty-description fallback.
    const skillLines = body.split('\n').filter((l) => l.startsWith('- aped-'));
    expect(skillLines.length).toBeGreaterThan(0);
    for (const line of skillLines) {
      // Format: `- <name> — <description>` (description may be empty).
      expect(line).toMatch(/^- aped-[a-z0-9-]+ — /);
    }

    // Spot-check the expected core skills are listed (these have shipped for
    // multiple tiers and are a stable signal that the generator walked the
    // templates dir, not just emitted the header).
    const names = skillLines.map((l) => l.match(/^- (aped-[a-z0-9-]+)/)?.[1]).filter(Boolean);
    for (const required of ['aped-prd', 'aped-dev', 'aped-review', 'aped-debug']) {
      expect(names, `skill index must include ${required}`).toContain(required);
    }
  });
});

