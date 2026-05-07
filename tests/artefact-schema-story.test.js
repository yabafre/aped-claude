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
  const root = mkdtempSync(join(tmpdir(), 'aped-story-schema-test-'));
  mkdirSync(join(root, APED_DIR, 'scripts', 'lib'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'data'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR, 'stories'), { recursive: true });

  // Install validator + Node walker + story schema (JSON).
  const validator = findScript('scripts/validate-story.sh');
  const walker = findScript('scripts/lib/markdown-schema-walk.mjs');
  const schema = findRef('data/story.schema.json');

  writeFileSync(join(root, validator.path), validator.content);
  chmodSync(join(root, validator.path), 0o755);
  writeFileSync(join(root, walker.path), walker.content);
  writeFileSync(join(root, schema.path), schema.content);
  return root;
}

function run(root, storyRelPath) {
  const r = spawnSync(
    'bash',
    [join(root, APED_DIR, 'scripts', 'validate-story.sh'), join(root, storyRelPath)],
    { encoding: 'utf8' },
  );
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

const CONFORMANT_STORY = `---
key: 1-1-foo
epic: 1
status: ready-for-dev
---

# Story 1-1 — Foo

## User Story

As a user, I want to do X so that Y.

## Acceptance Criteria

- AC1: Given I am logged in, when I click submit, then the form is submitted.
- AC2: Given the input is invalid, when I submit, then I see an error.

## Tasks

- [ ] Implement endpoint [AC: AC1]
- [ ] Add validation [AC: AC2]

## Dev Notes

### Architecture

Some prose about the design.

## File List

- src/foo.ts
- tests/foo.test.ts
`;

let sandbox;
beforeEach(() => {
  sandbox = setupSandbox();
});
afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('validate-story.sh', () => {
  it('exits 0 on a conformant story', () => {
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), CONFORMANT_STORY);
    const r = run(sandbox, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('flags an invented top-level heading', () => {
    const broken = CONFORMANT_STORY.replace(
      '## File List',
      '## Verdict\n\nGreat work.\n\n## File List',
    );
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/invented top-level heading 'Verdict'/);
  });

  it('flags a missing required heading', () => {
    const broken = CONFORMANT_STORY.replace(/## Acceptance Criteria[\s\S]*?## Tasks/, '## Tasks');
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/missing required heading 'Acceptance Criteria'/);
  });

  it('flags a malformed AC line (no Given/When/Then)', () => {
    const broken = CONFORMANT_STORY.replace(
      '- AC1: Given I am logged in, when I click submit, then the form is submitted.',
      '- AC1: blah',
    );
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/line does not match expected pattern under 'Acceptance Criteria'/);
  });

  it('flags an invented sub-heading under a forbid_invented section', () => {
    const broken = CONFORMANT_STORY.replace(
      '## Acceptance Criteria\n',
      '## Acceptance Criteria\n\n### Notes\n',
    );
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/invented heading 'Notes' not in schema/);
  });

  it('exits 2 when target file is missing', () => {
    const r = run(sandbox, join(OUTPUT_DIR, 'stories', 'does-not-exist.md'));
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/file not found/);
  });

  it('exits 2 with a clear message when the walker is unavailable', () => {
    rmSync(join(sandbox, APED_DIR, 'scripts', 'lib', 'markdown-schema-walk.mjs'));
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), CONFORMANT_STORY);
    const r = run(sandbox, target);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/walker not found/);
  });

  it('accepts an out-of-order top-level heading as a flag (not silent)', () => {
    // Move "Tasks" before "Acceptance Criteria" — schema requires fixed order.
    const broken = CONFORMANT_STORY
      .replace(/## Acceptance Criteria[\s\S]*?(?=## Tasks)/, '')
      .replace('## Tasks', '## Tasks\n\n- [ ] doit ordering test\n\n## Acceptance Criteria\n\n- AC1: Given X, when Y, then Z.\n');
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/out of order/);
  });

  it('accepts optional Dev Agent Record / Review Record as absent', () => {
    // CONFORMANT_STORY has neither; that's the default fixture. Re-check
    // exit 0 to lock the optional contract.
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), CONFORMANT_STORY);
    const r = run(sandbox, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });
});
