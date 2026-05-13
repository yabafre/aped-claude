// Per-story WORKTREE marker contract (6.8.0).
//
// Parallel mode keeps the legacy single WORKTREE file at
// $WORKTREE_PATH/.aped/WORKTREE (one worktree per story → no collision).
// Sequential mode writes WORKTREE.<story-key>.yaml per dispatched story so
// the shared worktree retains markers for ALL dispatched stories instead of
// overwriting on each dispatch.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
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

// `gs` stub that satisfies the script's `gs --version | grep git-spice` probe.
const GS_STUB_BODY = `case "\${1:-}" in
  --version) echo "git-spice 0.0-test"; exit 0 ;;
esac
exit 0`;

function setupRepo({ mode = 'parallel', sharedWorktree } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'aped-marker-test-'));
  run(`cd ${root} && git init -q -b main && git config user.email t@t && git config user.name t && git commit -q --allow-empty -m init`);
  mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
  writeFileSync(join(root, APED_DIR, 'config.yaml'), 'sprint:\n  post_dispatch_hook: []\n');
  let stateYaml = `schema_version: 4\nsprint:\n  mode: ${mode}\n  stories: {}\n`;
  if (mode === 'sequential') {
    stateYaml += `  shared_worktree: ${sharedWorktree}\n  stack_order: []\n  umbrella_branch: sprint/epic-test\n`;
  }
  writeFileSync(join(root, OUTPUT_DIR, 'state.yaml'), stateYaml);
  installScript(root, 'sprint-dispatch.sh');
  installScript(root, 'worktree-cleanup.sh');
  installScript(root, 'detect-package-runner.sh');
  installScript(root, 'log.sh');
  return root;
}

function prepareSharedWorktree(sandbox, sharedPath, umbrella) {
  // Create umbrella branch off main without checking out, then attach
  // the shared worktree to it. This mimics what aped-sprint does.
  run(`cd ${sandbox} && git branch ${umbrella} main && git worktree add ${sharedPath} ${umbrella}`);
}

let sandbox;
let sharedPath;
afterEach(() => {
  if (sharedPath && existsSync(sharedPath)) rmSync(sharedPath, { recursive: true, force: true });
  if (sandbox && existsSync(sandbox)) rmSync(sandbox, { recursive: true, force: true });
  sandbox = undefined;
  sharedPath = undefined;
});

describe('sprint-dispatch marker (6.8.0)', () => {
  it('parallel mode writes the legacy WORKTREE file (one marker per worktree)', () => {
    sandbox = setupRepo({ mode: 'parallel' });
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 1-1 KON-1`,
      { CLAUDE_PROJECT_DIR: sandbox },
    );
    expect(r.code, r.stderr).toBe(0);
    const wt = r.stdout.trim();
    expect(existsSync(join(wt, APED_DIR, 'WORKTREE'))).toBe(true);
    const markers = readdirSync(join(wt, APED_DIR)).filter((f) => f.startsWith('WORKTREE'));
    expect(markers).toEqual(['WORKTREE']);
    // Clean up the worktree dir created next to sandbox.
    if (wt && existsSync(wt)) rmSync(wt, { recursive: true, force: true });
  });

  it('sequential mode writes WORKTREE.<story-key>.yaml', () => {
    sharedPath = join(tmpdir(), `aped-marker-seq-${Date.now()}-1`);
    sandbox = setupRepo({ mode: 'sequential', sharedWorktree: sharedPath });
    prepareSharedWorktree(sandbox, sharedPath, 'sprint/epic-test');
    const stubDir = installStubBin(sandbox, 'gs', GS_STUB_BODY);
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 1-1 KON-1 sprint/epic-test`,
      { CLAUDE_PROJECT_DIR: sandbox, PATH: `${stubDir}:${process.env.PATH}` },
    );
    expect(r.code, r.stderr).toBe(0);
    expect(existsSync(join(sharedPath, APED_DIR, 'WORKTREE.1-1.yaml'))).toBe(true);
    const body = readFileSync(join(sharedPath, APED_DIR, 'WORKTREE.1-1.yaml'), 'utf8');
    expect(body).toMatch(/story_key: 1-1/);
    expect(body).toMatch(/sprint_mode: sequential/);
  });

  it('sequential mode preserves earlier markers when a second story is dispatched', () => {
    sharedPath = join(tmpdir(), `aped-marker-seq-${Date.now()}-2`);
    sandbox = setupRepo({ mode: 'sequential', sharedWorktree: sharedPath });
    prepareSharedWorktree(sandbox, sharedPath, 'sprint/epic-test');
    const stubDir = installStubBin(sandbox, 'gs', GS_STUB_BODY);
    const env = { CLAUDE_PROJECT_DIR: sandbox, PATH: `${stubDir}:${process.env.PATH}` };
    const r1 = run(`bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 2-1 KON-21 sprint/epic-test`, env);
    expect(r1.code, r1.stderr).toBe(0);
    const r2 = run(`bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 2-2 KON-22 sprint/epic-test`, env);
    expect(r2.code, r2.stderr).toBe(0);
    expect(existsSync(join(sharedPath, APED_DIR, 'WORKTREE.2-1.yaml'))).toBe(true);
    expect(existsSync(join(sharedPath, APED_DIR, 'WORKTREE.2-2.yaml'))).toBe(true);
    // The earlier marker's body must survive — story_key + branch intact.
    const m1 = readFileSync(join(sharedPath, APED_DIR, 'WORKTREE.2-1.yaml'), 'utf8');
    expect(m1).toMatch(/story_key: 2-1/);
    expect(m1).toMatch(/branch: feature\/KON-21-2-1/);
    const m2 = readFileSync(join(sharedPath, APED_DIR, 'WORKTREE.2-2.yaml'), 'utf8');
    expect(m2).toMatch(/story_key: 2-2/);
    expect(m2).toMatch(/branch: feature\/KON-22-2-2/);
  });

  it('worktree-cleanup --delete-branch iterates every per-story marker', () => {
    sharedPath = join(tmpdir(), `aped-marker-cleanup-${Date.now()}`);
    sandbox = setupRepo({ mode: 'sequential', sharedWorktree: sharedPath });
    prepareSharedWorktree(sandbox, sharedPath, 'sprint/epic-test');
    // Create 2 branches that we'll claim to have been dispatched into the
    // shared worktree (without actually running sprint-dispatch — we test
    // the cleanup script's reader independently).
    run(`cd ${sandbox} && git branch feature/KON-31-3-1 main && git branch feature/KON-32-3-2 main`);
    mkdirSync(join(sharedPath, APED_DIR), { recursive: true });
    writeFileSync(
      join(sharedPath, APED_DIR, 'WORKTREE.3-1.yaml'),
      'schema_version: 1\nstory_key: 3-1\nbranch: feature/KON-31-3-1\n',
    );
    writeFileSync(
      join(sharedPath, APED_DIR, 'WORKTREE.3-2.yaml'),
      'schema_version: 1\nstory_key: 3-2\nbranch: feature/KON-32-3-2\n',
    );
    const r = run(
      `cd ${sandbox} && bash ${sandbox}/${APED_DIR}/scripts/worktree-cleanup.sh ${sharedPath} --delete-branch --yes-destroy`,
      { CLAUDE_PROJECT_DIR: sandbox },
    );
    expect(r.code, r.stderr).toBe(0);
    const remaining = run(`cd ${sandbox} && git branch --list 'feature/KON-3*'`).stdout.trim();
    expect(remaining).toBe('');
  });
});
