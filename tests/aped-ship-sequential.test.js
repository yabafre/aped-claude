// Sequential sprint mode is topology-compatible with aped-ship — the umbrella
// → base PR contract operates on git refs only and never branches on
// sprint.mode. This e2e cristalises the contract by setting up a real
// sequential sprint topology (stacked branches all merged into the umbrella)
// and verifying the git invariants the aped-ship skill body relies on.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync, existsSync, readFileSync } from 'node:fs';
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

function run(cmd, env = {}) {
  const r = spawnSync('bash', ['-c', cmd], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

let sandbox;
afterEach(() => {
  if (sandbox && existsSync(sandbox)) rmSync(sandbox, { recursive: true, force: true });
  sandbox = undefined;
});

function setupSequentialSprintTopology() {
  // Build a real git repo that mimics what a sequential sprint produces:
  //   main
  //    └── sprint/epic-7  (umbrella, cut from main)
  //         ├── feature/KON-71-7-1  (story 1, stacked on umbrella)
  //         └── feature/KON-72-7-2  (story 2, stacked on story 1)
  // Both story branches are merged into the umbrella by aped-lead's
  // au-fil-de-l'eau merges (we simulate via plain `git merge --no-ff`).
  const root = mkdtempSync(join(tmpdir(), 'aped-ship-seq-'));
  run(`cd ${root} && git init -q -b main && git config user.email t@t && git config user.name t`);
  run(`cd ${root} && echo init > README.md && git add README.md && git commit -q -m init`);

  // Umbrella off main.
  run(`cd ${root} && git checkout -q -b sprint/epic-7 main`);

  // Story 1 stacked on umbrella, with one real commit.
  run(`cd ${root} && git checkout -q -b feature/KON-71-7-1 sprint/epic-7`);
  run(`cd ${root} && echo story1 > s1.txt && git add s1.txt && git commit -q -m 'feat(7-1): story 1'`);

  // Story 2 stacked on story 1, with one real commit.
  run(`cd ${root} && git checkout -q -b feature/KON-72-7-2 feature/KON-71-7-1`);
  run(`cd ${root} && echo story2 > s2.txt && git add s2.txt && git commit -q -m 'feat(7-2): story 2'`);

  // aped-lead au-fil-de-l'eau merges: both stories into the umbrella, in order.
  run(`cd ${root} && git checkout -q sprint/epic-7 && git merge --no-ff feature/KON-71-7-1 -m 'Merge 7-1' -q`);
  run(`cd ${root} && git merge --no-ff feature/KON-72-7-2 -m 'Merge 7-2' -q`);

  // Back to main so the ship invariants run from the right HEAD.
  run(`cd ${root} && git checkout -q main`);

  // APED scaffold layout — minimum for the validators.
  mkdirSync(join(root, APED_DIR, 'scripts'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
  writeFileSync(join(root, APED_DIR, 'config.yaml'),
    'base_branch: main\nsprint:\n  parallel_limit: 3\n  review_limit: 2\n');
  writeFileSync(join(root, OUTPUT_DIR, 'state.yaml'),
`schema_version: 4
current_phase: sprint
sprint:
  mode: sequential
  shared_worktree: ${root}-stack-epic-7
  active_epic: 7
  umbrella_branch: sprint/epic-7
  stack_order:
    - "7-1"
    - "7-2"
  stories:
    "7-1":
      status: done
      ticket: KON-71
      merged_into_umbrella: true
    "7-2":
      status: done
      ticket: KON-72
      merged_into_umbrella: true
`);
  return root;
}

describe('aped-ship sequential-mode e2e (6.8.0)', () => {
  it('every done story branch is reported as merged into the umbrella', () => {
    sandbox = setupSequentialSprintTopology();
    const r1 = run(`cd ${sandbox} && git branch --merged sprint/epic-7 | grep -q '^[[:space:]]*feature/KON-71-7-1$'`);
    expect(r1.code, r1.stderr).toBe(0);
    const r2 = run(`cd ${sandbox} && git branch --merged sprint/epic-7 | grep -q '^[[:space:]]*feature/KON-72-7-2$'`);
    expect(r2.code, r2.stderr).toBe(0);
  });

  it('umbrella → main ahead range contains both stories', () => {
    sandbox = setupSequentialSprintTopology();
    const r = run(`cd ${sandbox} && git rev-list --count main..sprint/epic-7`);
    expect(r.code, r.stderr).toBe(0);
    const ahead = parseInt(r.stdout.trim(), 10);
    expect(ahead).toBeGreaterThanOrEqual(2);
  });

  it('validate-state.sh accepts a schema_v4 state.yaml with sprint.mode=sequential', () => {
    sandbox = setupSequentialSprintTopology();
    installScript(sandbox, 'validate-state.sh');
    const r = run(`bash ${sandbox}/${APED_DIR}/scripts/validate-state.sh`,
      { CLAUDE_PROJECT_DIR: sandbox });
    expect(r.code, r.stderr).toBe(0);
  });

  it('aped-ship skill body documents the umbrella → base PR shape and the sequential-compat note', () => {
    // The skill is LLM prose, not a script — the contract this test locks
    // is that the body keeps documenting (a) the correct `gh pr create` shape
    // and (b) the explicit sequential-mode transparency paragraph added in
    // 6.8.0. If anyone refactors the skill and drops either, this fails.
    const skill = readFileSync(
      join(import.meta.dirname, '..', 'src', 'templates', 'skills', 'aped-ship', 'workflow.md'),
      'utf8',
    );
    // The PR-create command must target the umbrella as head against the base.
    expect(skill).toMatch(/gh pr create[^`]*--base[^`]*--head\s+"?\$UMBRELLA"?/);
    // The 6.8.0 transparency paragraph must be present.
    expect(skill).toMatch(/Sprint mode is transparent here/i);
    expect(skill).toMatch(/sequential/i);
  });
});
