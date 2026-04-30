// `.aped/.last-test-exit` discipline lint.
//
// Pre-4.9.0, four skills consumed "test pass evidence" via prose: aped-status
// described "the last test log fresh < 10 min" without specifying a path,
// aped-qa said "verify tests pass" without saying how to check, aped-quick
// had a bare `[ ] Tests pass` checkbox, aped-retro asked "all tests passing?"
// without a verification step.
//
// 4.9.0 standardises on `.aped/.last-test-exit` as the canonical evidence
// file (already written by run-tests.sh, already consumed by aped-debug:83
// and aped-lead:127). This lint locks the standardisation: every skill
// claiming "tests pass" must reference the canonical path.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

const SKILL_TEST_CHECKS = [
  {
    skill: 'aped-status.md',
    rationale: 'Step 7 ticket cache + test status display',
  },
  {
    skill: 'aped-qa.md',
    rationale: 'Test Coverage Report — verify tests pass',
  },
  {
    skill: 'aped-quick.md',
    rationale: 'Self-Review checkbox — Tests pass',
  },
  {
    skill: 'aped-retro.md',
    rationale: 'Phase 6 Readiness Assessment — testing column',
  },
  {
    skill: 'aped-debug.md',
    rationale: 'Discovery — failing artefacts (already canonical pre-4.9.0)',
  },
];

describe('.aped/.last-test-exit discipline (4.9.0 standardisation)', () => {
  it.each(SKILL_TEST_CHECKS.map((c) => [c.skill, c]))(
    '%s — references the canonical .aped/.last-test-exit path',
    (_name, check) => {
      const content = readFileSync(join(SKILLS_DIR, check.skill), 'utf8');
      expect(content).toMatch(/\.aped\/\.last-test-exit/);
    }
  );

  it('aped-status drops the legacy "last test log is fresh" prose', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-status.md'), 'utf8');
    // Old prose: "the last test log is fresh (< 10 min old)" — without
    // canonical path. Replaced by the canonical-path read.
    expect(content).toMatch(/canonical path; written by/);
  });

  it('aped-qa says "do NOT report QA complete based on stdout"', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-qa.md'), 'utf8');
    expect(content).toMatch(/Do NOT report.*QA complete/);
  });

  it('aped-quick gate references .aped/.last-test-exit returned 0', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-quick.md'), 'utf8');
    expect(content).toMatch(/cat \.aped\/\.last-test-exit.*returned `0`/);
  });
});
