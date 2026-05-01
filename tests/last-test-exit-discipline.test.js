// `.aped/.last-test-exit` discipline lint.
//
// 4.9.0 standardises on `.aped/.last-test-exit` as the canonical evidence
// file. This lint locks the standardisation: every skill claiming "tests
// pass" must reference the canonical path.
//
// 6.0.0: skills moved from flat aped-X.md to aped-X/{SKILL.md, workflow.md, steps/...}.
// readSkillContent returns the concatenated body of the entire skill.
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkillContent } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

const SKILL_TEST_CHECKS = [
  { skill: 'aped-status', rationale: 'Step 7 ticket cache + test status display' },
  { skill: 'aped-qa', rationale: 'Test Coverage Report — verify tests pass' },
  { skill: 'aped-quick', rationale: 'Self-Review checkbox — Tests pass' },
  { skill: 'aped-retro', rationale: 'Phase 6 Readiness Assessment — testing column' },
  { skill: 'aped-debug', rationale: 'Discovery — failing artefacts (already canonical pre-4.9.0)' },
];

describe('.aped/.last-test-exit discipline (4.9.0 standardisation)', () => {
  it.each(SKILL_TEST_CHECKS.map((c) => [c.skill, c]))(
    '%s — references the canonical .aped/.last-test-exit path',
    (_name, check) => {
      const content = readSkillContent(SKILLS_DIR, check.skill);
      expect(content).toMatch(/\.aped\/\.last-test-exit/);
    },
  );

  it('aped-status drops the legacy "last test log is fresh" prose', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-status');
    expect(content).toMatch(/canonical path; written by/);
  });

  it('aped-qa says "do NOT report QA complete based on stdout"', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-qa');
    expect(content).toMatch(/Do NOT report.*QA complete/);
  });

  it('aped-quick gate references .aped/.last-test-exit returned 0', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-quick');
    expect(content).toMatch(/cat \.aped\/\.last-test-exit.*returned `0`/);
  });
});
