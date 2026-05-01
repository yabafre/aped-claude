// detect-package-runner.sh — installation contract + decision tree.
//
// Pre-4.9.0, four places told the model to pick "the equivalent" of pnpm/npm
// based on prose. Every monorepo with bun/pnpm/yarn lockfile got the wrong
// runner picked some fraction of the time. This script is the deterministic
// replacement.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
const DETECT = ALL.find((s) => s.path.endsWith('detect-package-runner.sh'));

function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'aped-detect-pkg-'));
  mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
  return root;
}

function installInto(root) {
  const dest = join(root, DETECT.path);
  mkdirSync(join(dest, '..'), { recursive: true });
  writeFileSync(dest, DETECT.content);
  chmodSync(dest, 0o755);
  return dest;
}

function run(script, dir) {
  const r = spawnSync('bash', [script, dir], { encoding: 'utf8' });
  return { code: r.status ?? -1, stdout: (r.stdout ?? '').trim(), stderr: r.stderr ?? '' };
}

let sandbox;
beforeEach(() => { sandbox = setupSandbox(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('detect-package-runner.sh', () => {
  it('ships in the scripts manifest with executable=true', () => {
    expect(DETECT).toBeDefined();
    expect(DETECT.executable).toBe(true);
    expect(DETECT.path).toBe(`${APED_DIR}/scripts/detect-package-runner.sh`);
  });

  it('exits 2 with stderr ERROR when no package.json is present', () => {
    const script = installInto(sandbox);
    const dir = mkdtempSync(join(tmpdir(), 'aped-detect-no-pkg-'));
    try {
      const r = run(script, dir);
      expect(r.code).toBe(2);
      expect(r.stderr).toMatch(/^ERROR: no package\.json/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns "npm" when only package.json (no lockfile) is present', () => {
    const script = installInto(sandbox);
    const dir = mkdtempSync(join(tmpdir(), 'aped-detect-npm-'));
    try {
      writeFileSync(join(dir, 'package.json'), '{}');
      const r = run(script, dir);
      expect(r.code).toBe(0);
      expect(r.stdout).toBe('npm');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns "bun" when bun.lockb is present', () => {
    const script = installInto(sandbox);
    const dir = mkdtempSync(join(tmpdir(), 'aped-detect-bun-'));
    try {
      writeFileSync(join(dir, 'package.json'), '{}');
      writeFileSync(join(dir, 'bun.lockb'), '');
      const r = run(script, dir);
      expect(r.code).toBe(0);
      expect(r.stdout).toBe('bun');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns "pnpm" when pnpm-lock.yaml is present', () => {
    const script = installInto(sandbox);
    const dir = mkdtempSync(join(tmpdir(), 'aped-detect-pnpm-'));
    try {
      writeFileSync(join(dir, 'package.json'), '{}');
      writeFileSync(join(dir, 'pnpm-lock.yaml'), '');
      const r = run(script, dir);
      expect(r.code).toBe(0);
      expect(r.stdout).toBe('pnpm');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns "yarn" when yarn.lock is present', () => {
    const script = installInto(sandbox);
    const dir = mkdtempSync(join(tmpdir(), 'aped-detect-yarn-'));
    try {
      writeFileSync(join(dir, 'package.json'), '{}');
      writeFileSync(join(dir, 'yarn.lock'), '');
      const r = run(script, dir);
      expect(r.code).toBe(0);
      expect(r.stdout).toBe('yarn');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('precedence — bun > pnpm > yarn > npm when multiple lockfiles co-exist', () => {
    const script = installInto(sandbox);
    const dir = mkdtempSync(join(tmpdir(), 'aped-detect-multi-'));
    try {
      writeFileSync(join(dir, 'package.json'), '{}');
      writeFileSync(join(dir, 'package-lock.json'), '');
      writeFileSync(join(dir, 'yarn.lock'), '');
      writeFileSync(join(dir, 'pnpm-lock.yaml'), '');
      writeFileSync(join(dir, 'bun.lockb'), '');
      const r = run(script, dir);
      expect(r.code).toBe(0);
      expect(r.stdout).toBe('bun');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('defaults to current working directory when called without an argument', () => {
    const script = installInto(sandbox);
    const dir = mkdtempSync(join(tmpdir(), 'aped-detect-cwd-'));
    try {
      writeFileSync(join(dir, 'package.json'), '{}');
      writeFileSync(join(dir, 'pnpm-lock.yaml'), '');
      const r = spawnSync('bash', [script], { cwd: dir, encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe('pnpm');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('aped-ship and aped-dev reference the script (no "or equivalent" prose)', async () => {
    const path = require('node:path');
    const { readSkillContent } = await import('./_helpers/resolve-skills.js');
    const skillsDir = path.join(__dirname, '..', 'src', 'templates', 'skills');
    const ship = readSkillContent(skillsDir, 'aped-ship');
    const dev = readSkillContent(skillsDir, 'aped-dev');
    expect(ship).toMatch(/detect-package-runner\.sh/);
    expect(dev).toMatch(/detect-package-runner\.sh/);
    // The bare "or equivalent" prose for typecheck/dev-server should be gone.
    expect(ship).not.toMatch(/or the project-detected equivalent\b/);
    expect(dev).not.toMatch(/`npm run dev` or equivalent/);
  });
});
