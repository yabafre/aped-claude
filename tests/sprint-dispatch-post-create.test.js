// Post-dispatch bootstrap contract (6.7.5).
//
// sprint-dispatch.sh's job ends with a worktree on disk, the WORKTREE marker,
// and the log line. After 6.7.5 it also runs either the user's override hook
// (sprint.post_dispatch_hook in config.yaml) or smart defaults (install via
// the detected runner + copy .env from project root if .env.example exists).
//
// We use a real git repo in tmpdir so `git worktree add` works, and stub
// `npm`/`pnpm` via PATH so the install step is fast and observable.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL_SCRIPTS = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });

function findScript(suffix) {
  const s = ALL_SCRIPTS.find((x) => x.path.endsWith(suffix));
  if (!s) throw new Error(`No script template ending in ${suffix}`);
  return s;
}

function installScript(root, suffix) {
  const tpl = findScript(suffix);
  const dest = join(root, tpl.path);
  mkdirSync(join(dest, '..'), { recursive: true });
  writeFileSync(dest, tpl.content);
  chmodSync(dest, 0o755);
  return dest;
}

function run(cmd, env = {}, cwd) {
  const r = spawnSync('bash', ['-c', cmd], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    cwd,
  });
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

function installStubBin(root, name, body) {
  const dir = join(root, '.stub-bin');
  mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(p, 0o755);
  return dir;
}

function setupRepo() {
  const root = mkdtempSync(join(tmpdir(), 'aped-dispatch-test-'));
  run(`cd ${root} && git init -q && git config user.email t@t && git config user.name t && git commit -q --allow-empty -m init`);
  mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
  // Empty config so smart defaults run by default.
  writeFileSync(join(root, APED_DIR, 'config.yaml'), 'sprint:\n  post_dispatch_hook: []\n');
  // Empty state.yaml so dispatch can resolve umbrella to HEAD.
  writeFileSync(join(root, OUTPUT_DIR, 'state.yaml'), 'schema_version: 3\nsprint:\n  stories: {}\n');
  installScript(root, 'sprint-dispatch.sh');
  installScript(root, 'detect-package-runner.sh');
  installScript(root, 'log.sh');
  return root;
}

let sandbox;
beforeEach(() => { sandbox = setupRepo(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('sprint-dispatch post-create bootstrap (6.7.5)', () => {
  it('runs the detected package-runner install when package.json is present', () => {
    writeFileSync(join(sandbox, 'package.json'), '{"name":"x","version":"0.0.0"}');
    // Stage so `git worktree add` carries it into the new worktree.
    run(`cd ${sandbox} && git add package.json && git commit -q -m 'add package.json'`);
    // Stub npm — write a marker when invoked.
    const stubDir = installStubBin(sandbox, 'npm', `echo "stub-npm $@" > ${sandbox}/NPM_RAN`);
    const dispatchOut = run(
      `bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 1-1 KON-1`,
      { CLAUDE_PROJECT_DIR: sandbox, PATH: `${stubDir}:${process.env.PATH}` },
    );
    expect(dispatchOut.code, dispatchOut.stderr).toBe(0);
    expect(existsSync(join(sandbox, 'NPM_RAN'))).toBe(true);
    expect(readFileSync(join(sandbox, 'NPM_RAN'), 'utf8')).toMatch(/stub-npm install/);
  });

  it('picks pnpm when pnpm-lock.yaml is present', () => {
    writeFileSync(join(sandbox, 'package.json'), '{"name":"x","version":"0.0.0"}');
    writeFileSync(join(sandbox, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    run(`cd ${sandbox} && git add package.json pnpm-lock.yaml && git commit -q -m 'pnpm'`);
    const stubDir = installStubBin(sandbox, 'pnpm', `echo "stub-pnpm $@" > ${sandbox}/PNPM_RAN`);
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 1-1 KON-1`,
      { CLAUDE_PROJECT_DIR: sandbox, PATH: `${stubDir}:${process.env.PATH}` },
    );
    expect(r.code, r.stderr).toBe(0);
    expect(existsSync(join(sandbox, 'PNPM_RAN'))).toBe(true);
  });

  it('copies .env from project root when .env.example is in the worktree and .env is missing', () => {
    writeFileSync(join(sandbox, '.env.example'), 'FOO=example\n');
    writeFileSync(join(sandbox, '.env'), 'FOO=real\n');
    run(`cd ${sandbox} && git add .env.example && git commit -q -m 'add env.example'`);
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 1-1 KON-1`,
      { CLAUDE_PROJECT_DIR: sandbox },
    );
    expect(r.code, r.stderr).toBe(0);
    const wtPath = r.stdout.trim();
    expect(existsSync(join(wtPath, '.env'))).toBe(true);
    expect(readFileSync(join(wtPath, '.env'), 'utf8')).toContain('FOO=real');
  });

  it('runs override commands and skips smart defaults when sprint.post_dispatch_hook is non-empty', () => {
    writeFileSync(join(sandbox, 'package.json'), '{"name":"x"}');
    run(`cd ${sandbox} && git add package.json && git commit -q -m 'pkg'`);
    writeFileSync(
      join(sandbox, APED_DIR, 'config.yaml'),
      'sprint:\n  post_dispatch_hook:\n    - "touch HOOK_RAN"\n',
    );
    const stubDir = installStubBin(sandbox, 'npm', `echo "stub-npm $@" > ${sandbox}/NPM_SHOULD_NOT_RUN`);
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 1-1 KON-1`,
      { CLAUDE_PROJECT_DIR: sandbox, PATH: `${stubDir}:${process.env.PATH}` },
    );
    expect(r.code, r.stderr).toBe(0);
    const wtPath = r.stdout.trim();
    expect(existsSync(join(wtPath, 'HOOK_RAN'))).toBe(true);
    // Smart defaults must NOT have run.
    expect(existsSync(join(sandbox, 'NPM_SHOULD_NOT_RUN'))).toBe(false);
  });

  it('survives a failing install step (best-effort, never blocks dispatch)', () => {
    writeFileSync(join(sandbox, 'package.json'), '{"name":"x"}');
    run(`cd ${sandbox} && git add package.json && git commit -q -m 'pkg'`);
    // Stub npm that exits non-zero.
    const stubDir = installStubBin(sandbox, 'npm', `exit 99`);
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 1-1 KON-1`,
      { CLAUDE_PROJECT_DIR: sandbox, PATH: `${stubDir}:${process.env.PATH}` },
    );
    expect(r.code, r.stderr).toBe(0); // dispatch still succeeds
    const wtPath = r.stdout.trim();
    expect(existsSync(join(wtPath, APED_DIR, 'WORKTREE'))).toBe(true);
  });
});
