// Sequential sprint mode contract (6.7.5).
//
// - migrate-state.sh v3 → v4 seeds sprint.mode + sprint.stack_order defaults.
// - sprint-dispatch.sh HALTs when sprint.mode is sequential but `gs` is missing.
// - sprint-dispatch.sh stacks the branch via `gs branch create` inside the
//   shared worktree when sprint.mode is sequential and `gs` is available.
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

function installStubBin(root, name, body) {
  const dir = join(root, '.stub-bin');
  mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(p, 0o755);
  return dir;
}

function run(cmd, env = {}) {
  const r = spawnSync('bash', ['-c', cmd], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

function setupRepo() {
  const root = mkdtempSync(join(tmpdir(), 'aped-seq-test-'));
  run(`cd ${root} && git init -q && git config user.email t@t && git config user.name t && git commit -q --allow-empty -m init`);
  mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
  return root;
}

let sandbox;
beforeEach(() => { sandbox = setupRepo(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('migrate-state v3 → v4 (6.7.5)', () => {
  it('seeds sprint.mode: parallel and sprint.stack_order: [] when absent', () => {
    installScript(sandbox, 'migrate-state.sh');
    writeFileSync(join(sandbox, APED_DIR, 'config.yaml'), 'project_name: test\n');
    writeFileSync(
      join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 3
corrections_pointer: "${OUTPUT_DIR}/state-corrections.yaml"
corrections_count: 0
sprint:
  active_epic: 1
  umbrella_branch: "sprint/epic-1"
  project: "test"
  stories: {}
`,
    );
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/migrate-state.sh`, { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
    expect(after).toMatch(/schema_version:\s*4/);
    expect(after).toMatch(/mode:\s*parallel/);
    expect(after).toMatch(/stack_order:\s*\[\]/);
    // Backup preserved.
    expect(existsSync(join(sandbox, OUTPUT_DIR, 'state.yaml.pre-v4-migration.bak'))).toBe(true);
  });

  it('preserves a hand-set sprint.mode: sequential on re-migration', () => {
    installScript(sandbox, 'migrate-state.sh');
    writeFileSync(join(sandbox, APED_DIR, 'config.yaml'), 'project_name: test\n');
    writeFileSync(
      join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 3
corrections_pointer: "${OUTPUT_DIR}/state-corrections.yaml"
corrections_count: 0
sprint:
  active_epic: 1
  umbrella_branch: "sprint/epic-1"
  project: "test"
  mode: sequential
  stack_order:
    - "1-1"
    - "1-2"
  stories: {}
`,
    );
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/migrate-state.sh`, { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(sandbox, OUTPUT_DIR, 'state.yaml'), 'utf8');
    expect(after).toMatch(/mode:\s*sequential/);
    expect(after).toMatch(/1-1/);
    expect(after).toMatch(/1-2/);
  });
});

describe('sprint-dispatch sequential mode (6.7.5)', () => {
  it('HALTs with exit 5 when sprint.mode=sequential but `gs` is missing', () => {
    installScript(sandbox, 'sprint-dispatch.sh');
    installScript(sandbox, 'log.sh');
    writeFileSync(join(sandbox, APED_DIR, 'config.yaml'), 'sprint:\n  mode: sequential\n');
    writeFileSync(
      join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 4
sprint:
  mode: sequential
  shared_worktree: ${sandbox}/shared
  stories: {}
`,
    );
    // Stub `gs` that mimics GhostScript's --version banner — the dispatch
    // must reject it because git-spice isn't installed. Tests the
    // disambiguation logic, not the missing-binary path.
    const stubDir = installStubBin(sandbox, 'gs', `if [[ "$1" == "--version" ]]; then echo "GPL Ghostscript 10.0.0"; exit 0; fi\nexit 1`);
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 1-1 KON-1`,
      { CLAUDE_PROJECT_DIR: sandbox, PATH: `${stubDir}:${process.env.PATH}` },
    );
    expect(r.code).toBe(5);
    expect(r.stderr).toMatch(/git-spice/);
    expect(r.stderr).toMatch(/abhinav\/git-spice/);
  });

  it('stacks the branch via `gs branch create` when sequential + gs available', () => {
    installScript(sandbox, 'sprint-dispatch.sh');
    installScript(sandbox, 'log.sh');
    const shared = join(sandbox, 'shared-wt');
    mkdirSync(shared, { recursive: true });
    writeFileSync(join(sandbox, APED_DIR, 'config.yaml'), 'sprint:\n  mode: sequential\n');
    writeFileSync(
      join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 4
sprint:
  mode: sequential
  shared_worktree: ${shared}
  stories: {}
`,
    );
    // Stub `gs` — must answer `gs --version` with a git-spice signature so
    // the dispatch's tool-sniff check passes, and log other invocations.
    const stubDir = installStubBin(sandbox, 'gs', `if [[ "$1" == "--version" ]]; then echo "git-spice v0.0.0-test"; exit 0; fi\necho "stub-gs $@ pwd=$(pwd)" > ${sandbox}/GS_RAN\nexit 0`);
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 1-1 KON-1`,
      { CLAUDE_PROJECT_DIR: sandbox, PATH: `${stubDir}:${process.env.PATH}` },
    );
    expect(r.code, r.stderr).toBe(0);
    expect(existsSync(join(sandbox, 'GS_RAN'))).toBe(true);
    const gsLog = readFileSync(join(sandbox, 'GS_RAN'), 'utf8');
    expect(gsLog).toContain('branch create feature/KON-1-1-1');
    expect(gsLog).toContain(`pwd=${shared}`);
    // Marker carries sprint_mode: sequential.
    const marker = readFileSync(join(shared, APED_DIR, 'WORKTREE'), 'utf8');
    expect(marker).toContain('sprint_mode: sequential');
    expect(marker).toContain('story_key: 1-1');
  });

  it('falls back to parallel behavior when sprint.mode is absent', () => {
    installScript(sandbox, 'sprint-dispatch.sh');
    installScript(sandbox, 'log.sh');
    installScript(sandbox, 'detect-package-runner.sh');
    writeFileSync(join(sandbox, APED_DIR, 'config.yaml'), 'project_name: test\n');
    writeFileSync(
      join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 4
sprint:
  stories: {}
`,
    );
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/sprint-dispatch.sh 1-1 KON-1`,
      { CLAUDE_PROJECT_DIR: sandbox },
    );
    expect(r.code, r.stderr).toBe(0);
    // Created a per-story worktree (parallel behavior).
    const wtPath = r.stdout.trim();
    expect(wtPath).toContain('-KON-1-1-1');
    expect(existsSync(join(wtPath, APED_DIR, 'WORKTREE'))).toBe(true);
    const marker = readFileSync(join(wtPath, APED_DIR, 'WORKTREE'), 'utf8');
    expect(marker).toContain('sprint_mode: parallel');
  });
});
