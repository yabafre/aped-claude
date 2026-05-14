import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';
import { references } from '../src/templates/references.js';

// Cohort-2 (6.9.0) — Review Record + Dev Agent Record sub-section contracts.
// Verifies parent-scoped allowlist: a level-3 declared under one parent is NOT
// implicitly valid under another. Verifies required L3 missing + invented L3
// + optional L4 absent (empty Findings block tolerated).

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
  const root = mkdtempSync(join(tmpdir(), 'aped-cohort2-test-'));
  mkdirSync(join(root, APED_DIR, 'scripts', 'lib'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'data'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR, 'stories'), { recursive: true });
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

const STORY_BASE = `---
key: 1-1-foo
epic: 1
status: in-progress
---

# Story 1-1 — Foo

## User Story

As a user, I want X so that Y.

## Acceptance Criteria

- AC1: Given I am logged in, when I click submit, then the form is submitted.

## Tasks

- [x] Implement endpoint [AC: AC1]

## Dev Notes

Some prose.

## File List

- src/foo.ts
`;

const DAR_CONFORMANT = `
## Dev Agent Record

### Summary

Implemented the endpoint and added validation.

### Files changed

- src/foo.ts
- tests/foo.test.ts

### Deviations

None.

### Test output

\`\`\`
PASS tests/foo.test.ts
Tests: 3 passed
\`\`\`
`;

const REVIEW_CONFORMANT = `
## Review Record

**Date:** 2026-05-14
**Auditors:** Spec, Code, Edge & Hallucination
**Verdict:** done

### Findings

#### Resolved
- [LOW] AC2 missing test — fixed in abc123.

### Verification
- Test command: \`npm test\`
- Test output (final pass): 3 passed

### Ticket sync
- Ticket comment posted: YES
- PR opened: https://example.com/pr/1
`;

let sandbox;
beforeEach(() => { sandbox = setupSandbox(); });
afterEach(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('validate-story.sh — cohort-2 sub-section contracts (6.9.0)', () => {
  it('accepts a conformant Review Record + Dev Agent Record', () => {
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), STORY_BASE + DAR_CONFORMANT + REVIEW_CONFORMANT);
    const r = run(sandbox, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('flags an invented L3 under Review Record (### Verdict)', () => {
    const broken = STORY_BASE + DAR_CONFORMANT + REVIEW_CONFORMANT.replace(
      '### Findings',
      '### Verdict\n\ndone\n\n### Findings',
    );
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/invented heading 'Verdict' not in schema/);
  });

  it('flags missing required L3 — ### Summary missing from Dev Agent Record', () => {
    const broken = STORY_BASE + DAR_CONFORMANT.replace(
      /### Summary[\s\S]*?### Files changed/,
      '### Files changed',
    ) + REVIEW_CONFORMANT;
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/missing required heading 'Summary' under 'Dev Agent Record'/);
  });

  it('parent-scoping: ### Findings attached to ## User Story is invented (not implicitly valid)', () => {
    const broken = STORY_BASE.replace(
      '## User Story\n\nAs a user',
      '## User Story\n\n### Findings\n\nNotes here.\n\nAs a user',
    ) + DAR_CONFORMANT + REVIEW_CONFORMANT;
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/invented heading 'Findings' not in schema/);
  });

  it('accepts a pre-review story without Review Record (optional L2 absent)', () => {
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), STORY_BASE + DAR_CONFORMANT);
    const r = run(sandbox, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it('accepts an empty Findings block (all L4 are optional)', () => {
    const review = REVIEW_CONFORMANT.replace(
      /### Findings[\s\S]*?### Verification/,
      '### Findings\n\nNo findings raised.\n\n### Verification',
    );
    const target = join(OUTPUT_DIR, 'stories', '1-1-foo.md');
    writeFileSync(join(sandbox, target), STORY_BASE + DAR_CONFORMANT + review);
    const r = run(sandbox, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });
});
