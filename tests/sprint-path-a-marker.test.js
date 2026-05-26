// Path A worktree-marker contract (6.12.2).
//
// Before 6.12.2 `aped-sprint` Path A (workmux dispatch) called `workmux add -p`
// and never wrote `.aped/WORKTREE` — only `sprint-dispatch.sh` (Path B/C) did.
// /aped-story would then silently fall through to solo mode inside the
// workmux-created worktree, losing its sprint link.
//
// This test pins the fix:
//   1. write-worktree-marker.sh exists, is idempotent, validates inputs.
//   2. Path A in skills/aped-sprint/workflow.md.tmpl invokes the helper
//      between `workmux add` and `workmux send`, and does NOT use `-p`
//      anymore (the marker MUST exist before the prompt is queued).
//   3. step-01-init.md HALTs when running inside a real worktree with
//      no marker, instead of falling through to solo mode.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';
import { skills } from '../src/templates/skills.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL_SCRIPTS = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
const ALL_SKILLS = skills({
  apedDir: APED_DIR,
  outputDir: OUTPUT_DIR,
  projectName: 'demo',
  authorName: 't',
  communicationLang: 'english',
  documentLang: 'english',
  ticketSystem: 'none',
  gitProvider: 'github',
  cliVersion: '6.12.2',
});

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

let sandbox;
let worktree;
afterEach(() => {
  if (worktree && existsSync(worktree)) rmSync(worktree, { recursive: true, force: true });
  if (sandbox && existsSync(sandbox)) rmSync(sandbox, { recursive: true, force: true });
  sandbox = undefined;
  worktree = undefined;
});

describe('write-worktree-marker helper (6.12.2)', () => {
  function setup() {
    sandbox = mkdtempSync(join(tmpdir(), 'aped-path-a-test-'));
    worktree = mkdtempSync(join(tmpdir(), 'aped-path-a-wt-'));
    installScript(sandbox, 'write-worktree-marker.sh');
  }

  it('writes the legacy WORKTREE file in parallel mode', () => {
    setup();
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/write-worktree-marker.sh \
        --worktree ${worktree} --story 1-1 --ticket KON-1 \
        --branch feature/KON-1-1-1 --mode parallel --project-root ${sandbox}`,
    );
    expect(r.code, r.stderr).toBe(0);
    const marker = readFileSync(join(worktree, APED_DIR, 'WORKTREE'), 'utf8');
    expect(marker).toMatch(/story_key: 1-1/);
    expect(marker).toMatch(/branch: feature\/KON-1-1-1/);
    expect(marker).toMatch(/sprint_mode: parallel/);
    expect(marker).toMatch(new RegExp(`project_root: ${sandbox}`));
  });

  it('writes per-story WORKTREE.<key>.yaml in sequential mode', () => {
    setup();
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/write-worktree-marker.sh \
        --worktree ${worktree} --story 2-1 --ticket KON-2 \
        --branch feature/KON-2-2-1 --mode sequential --project-root ${sandbox}`,
    );
    expect(r.code, r.stderr).toBe(0);
    expect(existsSync(join(worktree, APED_DIR, 'WORKTREE.2-1.yaml'))).toBe(true);
    expect(existsSync(join(worktree, APED_DIR, 'WORKTREE'))).toBe(false);
  });

  it('rejects invalid story keys (path traversal)', () => {
    setup();
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/write-worktree-marker.sh \
        --worktree ${worktree} --story '1-1/../evil' --ticket KON-1 \
        --branch feature/x --mode sequential --project-root ${sandbox}`,
    );
    expect(r.code).toBe(3);
    expect(r.stderr).toMatch(/invalid STORY_KEY/);
  });

  it('refuses to overwrite a marker owned by a different story', () => {
    setup();
    // Write a marker for story 1-1.
    run(
      `bash ${sandbox}/${APED_DIR}/scripts/write-worktree-marker.sh \
        --worktree ${worktree} --story 1-1 --ticket KON-1 \
        --branch feature/KON-1-1-1 --mode parallel --project-root ${sandbox}`,
    );
    // Try to clobber it with story 9-9 (parallel mode reuses the same path).
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/write-worktree-marker.sh \
        --worktree ${worktree} --story 9-9 --ticket KON-9 \
        --branch feature/KON-9-9-9 --mode parallel --project-root ${sandbox}`,
    );
    expect(r.code).toBe(4);
    expect(r.stderr).toMatch(/already owned by story '1-1'/);
  });

  it('is idempotent on identical story_key (rewrites timestamp only)', () => {
    setup();
    const cmd = `bash ${sandbox}/${APED_DIR}/scripts/write-worktree-marker.sh \
      --worktree ${worktree} --story 1-1 --ticket KON-1 \
      --branch feature/KON-1-1-1 --mode parallel --project-root ${sandbox}`;
    const r1 = run(cmd);
    expect(r1.code, r1.stderr).toBe(0);
    const r2 = run(cmd);
    expect(r2.code, r2.stderr).toBe(0);
  });

  it('exits 2 when worktree path is missing', () => {
    setup();
    const r = run(
      `bash ${sandbox}/${APED_DIR}/scripts/write-worktree-marker.sh \
        --worktree /tmp/aped-does-not-exist-${Date.now()} --story 1-1 --ticket KON-1 \
        --branch feature/x --mode parallel --project-root ${sandbox}`,
    );
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/worktree path does not exist/);
  });
});

describe('aped-sprint Path A wiring (6.12.2)', () => {
  function readTpl(suffix) {
    const t = ALL_SKILLS.find((x) => x.path.endsWith(suffix));
    if (!t) throw new Error(`No skill template ending in ${suffix}`);
    return t.content;
  }

  it('workflow.md Path A invokes write-worktree-marker.sh', () => {
    const wf = readTpl('aped-sprint/workflow.md');
    expect(wf).toMatch(/scripts\/write-worktree-marker\.sh/);
  });

  it('workflow.md Path A queues the prompt via `workmux add -p` (6.12.4)', () => {
    const wf = readTpl('aped-sprint/workflow.md');
    // 6.12.4 reverted the 6.12.2 `add` + `send` split. Reason: `send` is
    // tmux send-keys under the hood and races Claude Code's TUI init —
    // keypresses arriving during init are swallowed. `-p` writes a prompt
    // file Claude Code reads at startup, before the TUI takes over.
    expect(wf).toMatch(/workmux add\s+-p\s+"aped-story \{story-key\}"\s+"\$BRANCH"/);
  });

  function findDispatchBlock(wf) {
    // Walk every ```bash fenced block and return the one that
    // both opens with the umbrella-resolve preamble (`BRANCH="feature/`)
    // and contains `workmux add -p`. The narrative paragraph above the
    // block has `workmux add -p` in inline backticks — we don't want that.
    const blocks = wf.match(/```bash[\s\S]*?```/g) ?? [];
    return blocks.find(
      (b) => /BRANCH="feature\//.test(b) && /workmux add\s+-p/.test(b),
    );
  }

  it('workflow.md Path A writes the marker inside the dispatch block', () => {
    const wf = readTpl('aped-sprint/workflow.md');
    const block = findDispatchBlock(wf);
    expect(block, 'dispatch code block with `workmux add -p` exists').toBeTruthy();
    expect(block).toMatch(/scripts\/write-worktree-marker\.sh/);
  });

  it('workflow.md Path A no longer relies on `workmux send` for first-prompt delivery', () => {
    const wf = readTpl('aped-sprint/workflow.md');
    const block = findDispatchBlock(wf);
    // `workmux send` may appear in the recovery snippet (close+open) and
    // in monitoring tips — both are fine. The fresh-dispatch block must
    // not use it because the TUI race makes it unreliable.
    expect(block).not.toMatch(/workmux send/);
  });

  it('step-01-init HALTs when running inside a worktree with no marker', () => {
    const init = readTpl('aped-story/steps/step-01-init.md');
    expect(init).toMatch(/--git-common-dir/);
    expect(init).toMatch(/IN_WORKTREE=true/);
    expect(init).toMatch(/write-worktree-marker\.sh/);
    // The HALT message must reference solo-mode fall-through as the failure mode
    // we're guarding against, so future readers understand why the guard exists.
    expect(init).toMatch(/refuse to fall through to solo mode/i);
  });
});
