import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scripts } from '../src/templates/scripts.js';
import { references } from '../src/templates/references.js';

// Cohort-3 (6.10.0) — prd.md structural schema. Same walker as cohort-1/2,
// no sub_sections. 7 level-2 required sections + lines_match on FR / NFR
// bullet shapes (accepts legacy FR1: and canonical FR-1: and bold-wrapped).

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
  const root = mkdtempSync(join(tmpdir(), 'aped-prd-schema-test-'));
  mkdirSync(join(root, APED_DIR, 'scripts', 'lib'), { recursive: true });
  mkdirSync(join(root, APED_DIR, 'data'), { recursive: true });
  mkdirSync(join(root, OUTPUT_DIR), { recursive: true });
  // 6.10.0 — the cohort-3 validator lives at ${APED_DIR}/scripts/validate-prd.sh
  // (shared dir), NOT ${APED_DIR}/aped-prd/scripts/validate-prd.sh (legacy).
  const validator = findScript('scripts/validate-prd.sh');
  // Note: there are TWO entries with this filename suffix; we want the shared one.
  // Both end in `scripts/validate-prd.sh` — the shared has no `aped-prd/` in path.
  const sharedValidator = ALL_SCRIPTS.find(
    (x) => x.path.endsWith('scripts/validate-prd.sh') && !x.path.includes('aped-prd'),
  );
  if (!sharedValidator) throw new Error('cohort-3 shared validate-prd.sh not found');
  const walker = findScript('scripts/lib/markdown-schema-walk.mjs');
  const schema = findRef('data/prd.schema.json');
  writeFileSync(join(root, sharedValidator.path), sharedValidator.content);
  chmodSync(join(root, sharedValidator.path), 0o755);
  writeFileSync(join(root, walker.path), walker.content);
  writeFileSync(join(root, schema.path), schema.content);
  return { root, validatorPath: sharedValidator.path };
}

function run(root, validatorPath, prdRelPath) {
  const r = spawnSync(
    'bash',
    [join(root, validatorPath), join(root, prdRelPath)],
    { encoding: 'utf8' },
  );
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

const PRD_CONFORMANT = `---
status: draft
---

# Product Requirements — Demo

## Executive Summary

We are building a thing.

## Success Criteria

- User: knows what to do.
- Business: revenue lift.

## Product Scope

MVP / Growth / Vision phases.

## Out of Scope

- Mobile app (deferred to v2).
- Multi-tenant (single-tenant only for MVP).

## User Journeys

User opens the app, performs an action, sees the result.

## Functional Requirements

- FR-1: User can log in with email and password.
- FR-2: System sends confirmation email after signup.
- FR-3: User can reset password via email link.
- FR-4: User can view profile.
- FR-5: User can update profile fields.
- FR-6: User can delete account.
- FR-7: System logs every authentication event.
- FR-8: User can enable 2FA.
- FR-9: System enforces session timeout after 30 minutes.
- FR-10: User can view session history.

## Non-Functional Requirements

- NFR-1: The system shall respond within 200ms p95.
- NFR-2: The system shall be available 99.9% of the time.
- NFR-3: All auth events shall be encrypted in transit.
`;

let sandbox;
let validatorPath;
beforeEach(() => {
  const s = setupSandbox();
  sandbox = s.root;
  validatorPath = s.validatorPath;
});
afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('validate-prd.sh — cohort-3 structural schema (6.10.0)', () => {
  it('exits 0 on a conformant PRD', () => {
    const target = join(OUTPUT_DIR, 'prd.md');
    writeFileSync(join(sandbox, target), PRD_CONFORMANT);
    const r = run(sandbox, validatorPath, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('flags a missing required section (## Functional Requirements removed)', () => {
    const broken = PRD_CONFORMANT.replace(/## Functional Requirements[\s\S]*?## Non-Functional/, '## Non-Functional');
    const target = join(OUTPUT_DIR, 'prd.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/missing required heading 'Functional Requirements'/);
  });

  it('flags an invented top-level heading', () => {
    const broken = PRD_CONFORMANT.replace(
      '## Non-Functional Requirements',
      '## Risks\n\nSomething.\n\n## Non-Functional Requirements',
    );
    const target = join(OUTPUT_DIR, 'prd.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/invented top-level heading 'Risks'/);
  });

  it('flags an invented L3 under Functional Requirements (forbid: true)', () => {
    const broken = PRD_CONFORMANT.replace(
      '## Functional Requirements\n',
      '## Functional Requirements\n\n### Edge cases\n\nFoo.\n',
    );
    const target = join(OUTPUT_DIR, 'prd.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/invented heading 'Edge cases' not in schema/);
  });

  it('flags a malformed FR bullet (no FR-N: prefix)', () => {
    const broken = PRD_CONFORMANT.replace(
      '- FR-1: User can log in with email and password.',
      '- The app should be fast and easy to use.',
    );
    const target = join(OUTPUT_DIR, 'prd.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/line does not match expected pattern under 'Functional Requirements'/);
  });

  it('accepts legacy FR1: form (no hyphen) and bold-wrapped **FR-2:** form', () => {
    const enriched = PRD_CONFORMANT.replace(
      '- FR-1: User can log in with email and password.',
      '- FR1: User can log in with email and password.',
    ).replace(
      '- FR-2: System sends confirmation email after signup.',
      '- **FR-2:** System sends confirmation email after signup.',
    );
    const target = join(OUTPUT_DIR, 'prd.md');
    writeFileSync(join(sandbox, target), enriched);
    const r = run(sandbox, validatorPath, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it('accepts conformant NFR bullets', () => {
    const target = join(OUTPUT_DIR, 'prd.md');
    writeFileSync(join(sandbox, target), PRD_CONFORMANT);
    const r = run(sandbox, validatorPath, target);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it('flags a PRD without Out of Scope (required since cohort-3)', () => {
    const broken = PRD_CONFORMANT.replace(/## Out of Scope[\s\S]*?## User Journeys/, '## User Journeys');
    const target = join(OUTPUT_DIR, 'prd.md');
    writeFileSync(join(sandbox, target), broken);
    const r = run(sandbox, validatorPath, target);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/missing required heading 'Out of Scope'/);
  });
});
