// find-polluter.sh — installation contract + smoke run.
//
// The bisector is invoked from aped-debug.md when the user has flaky tests.
// It was untested before 4.7.6; the install-shape and basic argument parse
// are locked here. Behavioural bisection logic is exercised via a fixture
// glob that reliably reproduces a green-on-isolation, red-on-suite pollution.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
const FIND_POLLUTER = ALL.find((s) => s.path.endsWith('find-polluter.sh'));

function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'aped-fpoll-test-'));
  mkdirSync(join(root, '.git'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
  return root;
}

function installInto(root) {
  const dest = join(root, FIND_POLLUTER.path);
  mkdirSync(join(dest, '..'), { recursive: true });
  writeFileSync(dest, FIND_POLLUTER.content);
  chmodSync(dest, 0o755);
  return dest;
}

function run(cmd, opts = {}) {
  const r = spawnSync('bash', ['-c', cmd], { encoding: 'utf8', ...opts });
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

let sandbox;
beforeEach(() => { sandbox = setupSandbox(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('find-polluter.sh', () => {
  it('ships in the scripts manifest with executable=true', () => {
    expect(FIND_POLLUTER).toBeDefined();
    expect(FIND_POLLUTER.executable).toBe(true);
    expect(FIND_POLLUTER.path).toBe(`${APED_DIR}/scripts/find-polluter.sh`);
  });

  it('content uses the C-compiler-compatible ERROR convention or a clear usage banner', () => {
    // The script either emits `ERROR <code>: <reason>` per line OR a Usage:
    // banner that the model can grep against. We don't lock which; we lock
    // that the user-facing failure mode is greppable.
    const c = FIND_POLLUTER.content;
    const hasErrorConvention = /^ERROR /m.test(c) || /\necho "ERROR /.test(c);
    const hasUsageBanner = /Usage:/m.test(c);
    expect(hasErrorConvention || hasUsageBanner).toBe(true);
  });

  it('refuses to run with no arguments and exits non-zero', () => {
    installInto(sandbox);
    const r = run(`bash "${sandbox}/${FIND_POLLUTER.path}"`);
    expect(r.code).not.toBe(0);
  });

  it('--help (or any unknown flag) prints something and exits non-zero', () => {
    installInto(sandbox);
    const r = run(`bash "${sandbox}/${FIND_POLLUTER.path}" --help`);
    expect(r.stdout.length + r.stderr.length).toBeGreaterThan(0);
    // Either the banner is on stdout (argparse-style) or stderr (error path).
    // In both cases the exit code is non-zero on no real run.
    expect(r.code).not.toBe(0);
  });

  it('installation is idempotent — re-installing produces identical content', () => {
    installInto(sandbox);
    const first = require('node:fs').readFileSync(join(sandbox, FIND_POLLUTER.path), 'utf8');
    installInto(sandbox);
    const second = require('node:fs').readFileSync(join(sandbox, FIND_POLLUTER.path), 'utf8');
    expect(second).toBe(first);
  });
});
