import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS = join(__dirname, '..', 'src', 'templates', 'skills');

function readSkill(name) {
  return readFileSync(join(SKILLS, name), 'utf8');
}

// 4.3.0 — H1 description anti-triggers + typo fix.
describe('skill description anti-triggers (4.3.0 — H1)', () => {
  it('aped-checkpoint description ends in `aped-checkpoint`, not `aped-check` (typo fix)', () => {
    const m = readSkill('aped-checkpoint.md').match(/^description:\s*(.+)$/m);
    expect(m[1]).toMatch(/aped-checkpoint/);
    expect(m[1]).not.toMatch(/aped-check[^p-]/);
  });

  it('aped-dev description has hotfix anti-trigger pointing to aped-quick', () => {
    const m = readSkill('aped-dev.md').match(/^description:\s*(.+)$/m);
    expect(m[1]).toMatch(/[Hh]otfix/);
    expect(m[1]).toMatch(/aped-quick/);
  });

  it('aped-qa description has unit-test anti-trigger pointing to aped-dev', () => {
    const m = readSkill('aped-qa.md').match(/^description:\s*(.+)$/m);
    expect(m[1]).toMatch(/unit tests?/);
    expect(m[1]).toMatch(/aped-dev/);
  });

  it('aped-status description has diff-walk anti-trigger pointing to aped-checkpoint', () => {
    const m = readSkill('aped-status.md').match(/^description:\s*(.+)$/m);
    expect(m[1]).toMatch(/diff|summari[sz]ing recent changes/);
    expect(m[1]).toMatch(/aped-checkpoint/);
  });
});

// 4.3.0 — H7 fresh-read discipline on the three skills that consume PRD/story
// in production: aped-dev, aped-quick, aped-review.
describe('fresh-read discipline (4.3.0 — H7)', () => {
  it.each([
    ['aped-dev.md'],
    ['aped-quick.md'],
    ['aped-review.md'],
  ])('%s declares fresh-read discipline', (name) => {
    const content = readSkill(name);
    expect(content, `${name} must declare Fresh-read discipline`).toMatch(/[Ff]resh-read discipline/);
    expect(content, `${name} must reference cached/compacted summary risk`).toMatch(/cached or compacted summary/);
  });
});

// 4.3.0 — H10 FR/NFR grounding on architecture decisions and dev tests.
describe('FR/NFR grounding (4.3.0 — H10)', () => {
  it('aped-arch Phase 2 requires recommendations to cite PRD FR/NFR IDs', () => {
    const content = readSkill('aped-arch.md');
    expect(content).toMatch(/citing the specific PRD FR\/NFR IDs/);
    expect(content).toMatch(/Decisions without FR\/NFR citations are vibes/);
  });

  it('aped-dev TDD section requires tests to trace to ACs and FR/NFR IDs', () => {
    const content = readSkill('aped-dev.md');
    expect(content).toMatch(/FR\/NFR grounding/);
    expect(content).toMatch(/trace back to a specific AC/);
  });
});

// 4.3.0 — P1 arch→epics conditional hard-stop.
describe('aped-epics arch hard-stop (4.3.0 — P1)', () => {
  it('declares conditional ✱ for architecture when state.architecture.status == done', () => {
    const content = readSkill('aped-epics.md');
    expect(content).toMatch(/Architecture.*conditional ✱/);
    expect(content).toMatch(/pipeline\.phases\.architecture\.status/);
    // The HALT message must mention the skipped escape-hatch
    const archSection = content.slice(content.indexOf('For Architecture (conditional'));
    expect(archSection).toMatch(/HALT/);
    expect(archSection).toMatch(/skipped/);
  });
});

// 4.3.0 — P6 auto-mode gate language in aped-claude block template.
describe('aped-claude auto-mode gate (4.3.0 — P6)', () => {
  it('block template declares gates are mandatory regardless of harness auto-mode', () => {
    const content = readSkill('aped-claude.md');
    expect(content).toMatch(/Gates are mandatory/);
    expect(content).toMatch(/auto-mode/i);
    expect(content).toMatch(/never bypasses APED gates/);
  });
});
