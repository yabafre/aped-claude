import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, chmodSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';

// 6.12.0 — B9 STATE.md digest. Direct execution of digest-state.sh against
// fixture state.yaml shapes. The CLI subcommand `aped-method state` is a
// thin spawnSync wrapper around this script; runtime semantics are
// verified here. CLI dispatch coverage stays in the index.js help-text.

const APED_DIR = '.aped';
const OUTPUT_DIR = 'docs/aped';
const ALL_SCRIPTS = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });

function findScript(suffix) {
  const s = ALL_SCRIPTS.find((x) => x.path.endsWith(suffix));
  if (!s) throw new Error(`No script template ending in ${suffix}`);
  return s;
}

let sandbox;
let scriptPath;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'aped-state-digest-'));
  mkdirSync(join(sandbox, APED_DIR, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, OUTPUT_DIR), { recursive: true });
  const digest = findScript('scripts/digest-state.sh');
  writeFileSync(join(sandbox, digest.path), digest.content);
  chmodSync(join(sandbox, digest.path), 0o755);
  scriptPath = join(sandbox, digest.path);
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function run(args = []) {
  return spawnSync('bash', [scriptPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: sandbox },
  });
}

describe('digest-state.sh — STATE.md digest (6.12.0)', () => {
  it('exits 1 with HINT when state.yaml is missing', () => {
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/state\.yaml not found/);
    expect(r.stderr).toMatch(/Run.*npx aped-method/);
  });

  it('renders a fresh-project digest with current_phase: none', () => {
    writeFileSync(
      join(sandbox, OUTPUT_DIR, 'state.yaml'),
      'schema_version: 4\npipeline:\n  current_phase: "none"\n  phases: {}\ncorrections_count: 0\n',
    );
    const r = run();
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/^# APED Pipeline Snapshot/);
    expect(r.stdout).toMatch(/\*\*Phase:\*\* `none`/);
    expect(r.stdout).toMatch(/\*\*Status:\*\* `not-started`/);
    expect(r.stdout).toMatch(/\*\*Watch items \(W\):\*\* 0/);
    expect(r.stdout).toMatch(/\*\*Total recorded:\*\* 0/);
  });

  it('renders mid-pipeline digest with phase/subphase/output', () => {
    writeFileSync(
      join(sandbox, OUTPUT_DIR, 'state.yaml'),
      `schema_version: 4
pipeline:
  current_phase: "architecture"
  phases:
    architecture:
      status: "in-progress"
      current_subphase: "council-dispatches"
      completed_subphases:
        - "context-analysis"
        - "technology-decisions"
      output: "docs/aped/architecture.md"
      last_updated: "2026-05-15T14:00:00Z"
      watch_items:
        - "W-1: rate-limit assumption pending load test"
        - "W-2: oauth provider churn"
      residual_gaps:
        - "G-1: OAuth provider list TBD"
      epic_zero_stories:
        - "E0.1: Provision Vercel + Neon"
        - "E0.2: Wire Postgres migrations"
        - "E0.3: Auth scaffolding"
corrections_count: 3
`,
    );
    const r = run();
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/\*\*Phase:\*\* `architecture`/);
    expect(r.stdout).toMatch(/\*\*Status:\*\* `in-progress`/);
    expect(r.stdout).toMatch(/\*\*Subphase:\*\* `council-dispatches`/);
    expect(r.stdout).toMatch(/\*\*Completed subphases:\*\* 2/);
    expect(r.stdout).toMatch(/\*\*Output:\*\* `docs\/aped\/architecture\.md`/);
    expect(r.stdout).toMatch(/\*\*Watch items \(W\):\*\* 2/);
    expect(r.stdout).toMatch(/\*\*Residual gaps \(G\):\*\* 1/);
    expect(r.stdout).toMatch(/\*\*Epic Zero stories \(E0\):\*\* 3/);
    expect(r.stdout).toMatch(/\*\*Total recorded:\*\* 3/);
  });

  it('--write persists STATE.md at project root and prints nothing to stdout', () => {
    writeFileSync(
      join(sandbox, OUTPUT_DIR, 'state.yaml'),
      'schema_version: 4\npipeline:\n  current_phase: "prd"\n  phases:\n    prd:\n      status: "in-progress"\n',
    );
    const r = run(['--write']);
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toMatch(/Wrote .*STATE\.md/);
    const statePath = join(sandbox, 'STATE.md');
    expect(existsSync(statePath)).toBe(true);
    const content = readFileSync(statePath, 'utf-8');
    expect(content).toMatch(/^# APED Pipeline Snapshot/);
    expect(content).toMatch(/\*\*Phase:\*\* `prd`/);
  });

  it('handles missing yq gracefully via grep/awk fallback for current_phase', () => {
    // Even without yq, the regex fallback must extract current_phase.
    writeFileSync(
      join(sandbox, OUTPUT_DIR, 'state.yaml'),
      'schema_version: 4\npipeline:\n  current_phase: "epics"\n  phases: {}\n',
    );
    // Strip yq from PATH for this run.
    const r = spawnSync('bash', [scriptPath], {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: sandbox, PATH: '/usr/bin:/bin' },
    });
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/\*\*Phase:\*\* `epics`/);
  });
});
