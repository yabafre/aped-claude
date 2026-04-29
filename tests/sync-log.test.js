import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  chmodSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';

// Materialise the sync-log.sh template into a fresh sandbox per test, with
// a minimal config.yaml that turns the helper on. Mirrors the sandbox setup
// in sprint-scripts.test.js so the patterns stay aligned across the suite.
const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL_SCRIPTS = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });

function findScript(suffix) {
  const s = ALL_SCRIPTS.find((x) => x.path.endsWith(suffix));
  if (!s) throw new Error(`No script template ending in ${suffix}`);
  return s;
}

function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'aped-sync-log-test-'));
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

function writeConfig(root, enabled = true) {
  writeFileSync(
    join(root, APED_DIR, 'config.yaml'),
    `sync_logs:\n  enabled: ${enabled ? 'true' : 'false'}\n  dir: "docs/sync-logs/"\n`,
  );
}

function run(cmd, env = {}) {
  // spawnSync via `bash -c` so we capture both stdout and stderr regardless of
  // exit code. execSync only surfaces stderr on failure, which hides the
  // sync-log helper's stderr summaries on success.
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
let scriptPath;
beforeEach(() => {
  sandbox = setupSandbox();
  installScript(sandbox, 'sync-log.sh');
  writeConfig(sandbox, true);
  scriptPath = `${sandbox}/${APED_DIR}/scripts/sync-log.sh`;
});
afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('sync-log.sh', () => {
  it('start <provider> creates a JSON file with the required keys', () => {
    const r = run(`bash ${scriptPath} start linear`, { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const logPath = r.stdout.trim();
    expect(logPath).toMatch(/docs\/sync-logs\/linear-sync-.*\.json$/);
    const doc = JSON.parse(readFileSync(logPath, 'utf8'));
    expect(doc.sync_id).toMatch(/^linear-sync-/);
    expect(typeof doc.started_at).toBe('string');
    expect(doc.provider).toBe('linear');
    expect(typeof doc.operator).toBe('string');
    expect(doc.phases).toEqual({});
    expect(doc.totals).toEqual({});
    expect('directive_version' in doc).toBe(true);
  });

  it('phase merges fragment under phases.<name> and preserves status', () => {
    const start = run(`bash ${scriptPath} start linear`, { CLAUDE_PROJECT_DIR: sandbox });
    const log = start.stdout.trim();

    const r1 = run(`bash ${scriptPath} phase ${log} auth_check complete`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r1.code, r1.stderr).toBe(0);

    const r2 = run(
      `bash ${scriptPath} phase ${log} projects complete '{"calls":2,"created":["a","b"]}'`,
      { CLAUDE_PROJECT_DIR: sandbox },
    );
    expect(r2.code, r2.stderr).toBe(0);

    const doc = JSON.parse(readFileSync(log, 'utf8'));
    expect(doc.phases.auth_check).toEqual({ status: 'complete' });
    expect(doc.phases.projects.status).toBe('complete');
    expect(doc.phases.projects.calls).toBe(2);
    expect(doc.phases.projects.created).toEqual(['a', 'b']);
  });

  it('record initialises totals.<key> then sums subsequent values', () => {
    const start = run(`bash ${scriptPath} start linear`, { CLAUDE_PROJECT_DIR: sandbox });
    const log = start.stdout.trim();

    const r1 = run(`bash ${scriptPath} record ${log} api_calls_total 12`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r1.code, r1.stderr).toBe(0);
    let doc = JSON.parse(readFileSync(log, 'utf8'));
    expect(doc.totals.api_calls_total).toBe(12);

    const r2 = run(`bash ${scriptPath} record ${log} api_calls_total 5`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r2.code, r2.stderr).toBe(0);
    doc = JSON.parse(readFileSync(log, 'utf8'));
    expect(doc.totals.api_calls_total).toBe(17);
  });

  it('end sets ended_at and the final JSON parses cleanly', () => {
    const start = run(`bash ${scriptPath} start linear`, { CLAUDE_PROJECT_DIR: sandbox });
    const log = start.stdout.trim();

    const r = run(`bash ${scriptPath} end ${log}`, { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe(log);

    const doc = JSON.parse(readFileSync(log, 'utf8'));
    expect(typeof doc.ended_at).toBe('string');
    expect(doc.ended_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sync_logs.enabled: false makes every subcommand a silent no-op', () => {
    writeConfig(sandbox, false);

    const r1 = run(`bash ${scriptPath} start linear`, { CLAUDE_PROJECT_DIR: sandbox });
    expect(r1.code).toBe(0);
    expect(r1.stdout).toBe('');
    expect(r1.stderr).toBe('');

    // Even with bogus arguments, disabled = silent exit 0.
    const r2 = run(`bash ${scriptPath} phase /tmp/no-such-log foo complete`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r2.code).toBe(0);
    expect(r2.stdout).toBe('');
    expect(r2.stderr).toBe('');

    const r3 = run(`bash ${scriptPath} record /tmp/no-such-log k 1`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r3.code).toBe(0);
    expect(r3.stdout).toBe('');
    expect(r3.stderr).toBe('');

    const r4 = run(`bash ${scriptPath} end /tmp/no-such-log`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r4.code).toBe(0);
    expect(r4.stdout).toBe('');
    expect(r4.stderr).toBe('');
  });

  it('two parallel phase calls on the same log both succeed (lock works)', () => {
    const start = run(`bash ${scriptPath} start linear`, { CLAUDE_PROJECT_DIR: sandbox });
    const log = start.stdout.trim();

    // Background two phase calls and wait — assert both writes survive.
    const r = run(
      `bash -c '
        bash ${scriptPath} phase ${log} p1 complete '"'"'{"calls":1}'"'"' &
        bash ${scriptPath} phase ${log} p2 complete '"'"'{"calls":2}'"'"' &
        wait
      '`,
      { CLAUDE_PROJECT_DIR: sandbox },
    );
    expect(r.code, r.stderr).toBe(0);

    const doc = JSON.parse(readFileSync(log, 'utf8'));
    expect(doc.phases.p1).toEqual({ status: 'complete', calls: 1 });
    expect(doc.phases.p2).toEqual({ status: 'complete', calls: 2 });
  });
});

// ── Retention pruning (4.1.0) ──
function writeConfigWithRetention(root, { mode, keepLastN } = {}) {
  const lines = ['sync_logs:', '  enabled: true', '  dir: "docs/sync-logs/"'];
  if (mode) {
    lines.push('  retention:');
    lines.push(`    mode: ${mode}`);
    if (keepLastN !== undefined) lines.push(`    keep_last_n: ${keepLastN}`);
  }
  writeFileSync(join(root, APED_DIR, 'config.yaml'), lines.join('\n') + '\n');
}

function syncLogDir(root) {
  return join(root, 'docs/sync-logs');
}

function seedLog(root, provider, idx) {
  const dir = syncLogDir(root);
  mkdirSync(dir, { recursive: true });
  // Filename matches the helper's `<provider>-sync-<iso>.json` pattern.
  const path = join(dir, `${provider}-sync-2026-04-2${idx}T00-00-00Z.json`);
  writeFileSync(
    path,
    JSON.stringify({
      sync_id: `${provider}-sync-2026-04-2${idx}T00-00-00Z`,
      provider,
      started_at: '2026-04-2' + idx + 'T00:00:00Z',
      ended_at: '2026-04-2' + idx + 'T00:00:00Z',
      operator: 'tester',
      directive_version: null,
      phases: {},
      totals: {},
    }),
  );
  // Make the mtime monotonic with idx so newer idx = newer mtime.
  const t = new Date(2026, 3, 20 + idx);
  utimesSync(path, t, t);
  return path;
}

function listLogs(root, provider) {
  const dir = syncLogDir(root);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const filter = provider ? new RegExp(`^${provider}-sync-`) : /-sync-/;
  return entries.filter((f) => filter.test(f) && f.endsWith('.json')).sort();
}

describe('sync-log.sh retention', () => {
  it('mode=none: cmd_end does not prune any files', () => {
    writeConfigWithRetention(sandbox); // no retention block
    for (let i = 0; i < 5; i++) seedLog(sandbox, 'linear', i);

    const start = run(`bash ${scriptPath} start linear`, { CLAUDE_PROJECT_DIR: sandbox });
    const log = start.stdout.trim();
    const r = run(`bash ${scriptPath} end ${log}`, { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);

    // 5 seeded + 1 from start = 6 logs, none pruned.
    expect(listLogs(sandbox, 'linear')).toHaveLength(6);
  });

  it('mode=keep_last_n with N=3 prunes the oldest, keeps the newest 3', () => {
    writeConfigWithRetention(sandbox, { mode: 'keep_last_n', keepLastN: 3 });
    // Seed 5 logs with strictly increasing mtimes (idx 0 = oldest).
    for (let i = 0; i < 5; i++) seedLog(sandbox, 'linear', i);

    // start creates a 6th log (newest mtime). end then prunes — keeping
    // the 3 most recent overall (4, 5 from seed + the just-started one = 3
    // newest). Result: 4 oldest removed.
    const start = run(`bash ${scriptPath} start linear`, { CLAUDE_PROJECT_DIR: sandbox });
    const log = start.stdout.trim();
    const r = run(`bash ${scriptPath} end ${log}`, { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);

    const remaining = listLogs(sandbox, 'linear');
    expect(remaining).toHaveLength(3);
    // The just-ended log must still be present.
    expect(remaining).toContain(log.split('/').pop());
  });

  it('provider isolation: linear retention does not touch github logs', () => {
    writeConfigWithRetention(sandbox, { mode: 'keep_last_n', keepLastN: 1 });
    // 3 linear logs (oldest mtimes), then 2 github logs (newer).
    for (let i = 0; i < 3; i++) seedLog(sandbox, 'linear', i);
    for (let i = 3; i < 5; i++) seedLog(sandbox, 'github', i);

    const start = run(`bash ${scriptPath} start linear`, { CLAUDE_PROJECT_DIR: sandbox });
    const log = start.stdout.trim();
    const r = run(`bash ${scriptPath} end ${log}`, { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);

    // linear: 3 seeded + 1 from start = 4, keep_last_n=1 → 1 remains.
    expect(listLogs(sandbox, 'linear')).toHaveLength(1);
    // github: untouched (we ended a linear log; no github sync ran).
    expect(listLogs(sandbox, 'github')).toHaveLength(2);
  });

  it('prune subcommand dry-run lists deletions without removing files', () => {
    writeConfigWithRetention(sandbox, { mode: 'keep_last_n', keepLastN: 2 });
    for (let i = 0; i < 5; i++) seedLog(sandbox, 'linear', i);

    const r = run(`bash ${scriptPath} prune`, {
      CLAUDE_PROJECT_DIR: sandbox,
      PRUNE_DRY_RUN: '1',
    });
    expect(r.code, r.stderr).toBe(0);
    // Stderr summary mentions "would prune".
    expect(r.stderr).toMatch(/would prune/i);
    // No files actually deleted.
    expect(listLogs(sandbox, 'linear')).toHaveLength(5);
  });

  it('prune subcommand --apply (PRUNE_DRY_RUN=0) actually deletes', () => {
    writeConfigWithRetention(sandbox, { mode: 'keep_last_n', keepLastN: 2 });
    for (let i = 0; i < 5; i++) seedLog(sandbox, 'linear', i);

    const r = run(`bash ${scriptPath} prune`, {
      CLAUDE_PROJECT_DIR: sandbox,
      PRUNE_DRY_RUN: '0',
    });
    expect(r.code, r.stderr).toBe(0);
    expect(listLogs(sandbox, 'linear')).toHaveLength(2);
  });

  it('prune subcommand with mode=none prints the helpful message and exits 0', () => {
    writeConfigWithRetention(sandbox); // no retention block
    for (let i = 0; i < 3; i++) seedLog(sandbox, 'linear', i);

    const r = run(`bash ${scriptPath} prune`, { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/retention disabled/i);
    expect(listLogs(sandbox, 'linear')).toHaveLength(3);
  });
});
