import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';
import { references } from '../src/templates/references.js';

const APED_DIR = '.aped';
const OUTPUT_DIR = 'aped-output';
const ALL_SCRIPTS = scripts({ apedDir: APED_DIR, outputDir: OUTPUT_DIR });
const ALL_REFS = references({ apedDir: APED_DIR });

function findScript(suffix) {
  const s = ALL_SCRIPTS.find((x) => x.path.endsWith(suffix));
  if (!s) throw new Error(`No script template ending in ${suffix}`);
  return s;
}
function findRef(suffix) {
  const r = ALL_REFS.find((x) => x.path.endsWith(suffix));
  if (!r) throw new Error(`No reference template ending in ${suffix}`);
  return r;
}

function setupSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'aped-epics-schema-test-'));
  mkdirSync(join(root, APED_DIR, 'scripts', 'lib'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'data'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });

  const validator = findScript('scripts/validate-epics.sh');
  const walker = findScript('scripts/lib/markdown-schema-walk.mjs');
  const schema = findRef('data/epics.schema.json');

  writeFileSync(join(root, validator.path), validator.content);
  chmodSync(join(root, validator.path), 0o755);
  writeFileSync(join(root, walker.path), walker.content);
  writeFileSync(join(root, schema.path), schema.content);
  return root;
}

function run(root, target) {
  const r = spawnSync(
    'bash',
    [join(root, APED_DIR, 'scripts', 'validate-epics.sh'), join(root, target)],
    { encoding: 'utf8' },
  );
  return { code: r.status ?? -1, stderr: r.stderr ?? '', stdout: r.stdout ?? '' };
}

const CONFORMANT_EPICS = `# Epics — MyProject

## Epic 1: Foundation

Stories:
- 1-1-project-setup — bootstrap repo, CI, deps
- 1-2-auth — JWT login

## Epic 2: Feature

Stories:
- 2-1-dashboard

## FR Coverage Map

| FR  | Epic | Story          |
|-----|------|----------------|
| FR1 | 1    | 1-1-project-setup |
| FR2 | 1    | 1-2-auth       |
| FR3 | 2    | 2-1-dashboard  |
`;

let sandbox;
beforeEach(() => { sandbox = setupSandbox(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('validate-epics.sh', () => {
  it('exits 0 on a conformant epics.md (variable Epic N count)', () => {
    const target = join(OUTPUT_DIR, 'epics.md');
    writeFileSync(join(sandbox, target), CONFORMANT_EPICS);
    const r = run(sandbox, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('flags missing FR Coverage Map', () => {
    const broken = CONFORMANT_EPICS.replace(/## FR Coverage Map[\s\S]*$/, '');
    const target = join(OUTPUT_DIR, 'epics.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/missing required heading 'FR Coverage Map'/);
  });

  it('does NOT flag varying "## Epic N: ..." top-level headings as invented', () => {
    // 5 epics. Conformant top-level even though "## Epic 1:" / "## Epic 2:" /
    // ... are not enumerated in the schema. Whole point of omitting top_level
    // for epics in 6.3.0.
    const many = `# Epics

## Epic 1: A
## Epic 2: B
## Epic 3: C
## Epic 4: D
## Epic 5: E

## FR Coverage Map
`;
    const target = join(OUTPUT_DIR, 'epics.md');
    writeFileSync(join(sandbox, target), many);
    const r = run(sandbox, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stderr).not.toMatch(/invented top-level heading/);
  });

  it('exits 2 when target file is missing', () => {
    const r = run(sandbox, 'nope.md');
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/file not found/);
  });
});
