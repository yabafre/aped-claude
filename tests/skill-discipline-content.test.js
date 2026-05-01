import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkillContent, resolveSkillEntries } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS = join(__dirname, '..', 'src', 'templates', 'skills');

function readSkill(name) {
  // Drop legacy `.md` suffix if caller passed it.
  return readSkillContent(SKILLS, name.replace(/\.md$/, ''));
}

function readSkillFrontmatter(name) {
  const stripped = name.replace(/\.md$/, '');
  const entry = resolveSkillEntries(SKILLS).find((e) => e.name === stripped);
  return entry ? entry.content : '';
}

// 4.3.0 — H1 description anti-triggers + typo fix.
describe('skill description anti-triggers (4.3.0 — H1)', () => {
  it('aped-checkpoint description ends in `aped-checkpoint`, not `aped-check` (typo fix)', () => {
    const m = readSkillFrontmatter('aped-checkpoint').match(/^description:\s*(.+)$/m);
    expect(m[1]).toMatch(/aped-checkpoint/);
    expect(m[1]).not.toMatch(/aped-check[^p-]/);
  });

  it('aped-dev description has hotfix anti-trigger pointing to aped-quick', () => {
    const m = readSkillFrontmatter('aped-dev').match(/^description:\s*(.+)$/m);
    expect(m[1]).toMatch(/[Hh]otfix/);
    expect(m[1]).toMatch(/aped-quick/);
  });

  it('aped-qa description has unit-test anti-trigger pointing to aped-dev', () => {
    const m = readSkillFrontmatter('aped-qa').match(/^description:\s*(.+)$/m);
    expect(m[1]).toMatch(/unit tests?/);
    expect(m[1]).toMatch(/aped-dev/);
  });

  it('aped-status description has diff-walk anti-trigger pointing to aped-checkpoint', () => {
    const m = readSkillFrontmatter('aped-status').match(/^description:\s*(.+)$/m);
    expect(m[1]).toMatch(/diff|summari[sz]ing recent changes/);
    expect(m[1]).toMatch(/aped-checkpoint/);
  });
});

// 4.3.0 — H7 fresh-read discipline on the three skills that consume PRD/story
// in production: aped-dev, aped-quick, aped-review.
describe('fresh-read discipline (4.3.0 — H7)', () => {
  it.each([
    ['aped-dev'],
    ['aped-quick'],
    ['aped-review'],
  ])('%s declares fresh-read discipline', (name) => {
    const content = readSkill(name);
    expect(content, `${name} must declare Fresh-read discipline`).toMatch(/[Ff]resh-read discipline/);
    expect(content, `${name} must reference cached/compacted summary risk`).toMatch(/cached or compacted summary/);
  });
});

// 4.3.0 — H10 FR/NFR grounding on architecture decisions and dev tests.
describe('FR/NFR grounding (4.3.0 — H10)', () => {
  it('aped-arch Phase 2 requires recommendations to cite PRD FR/NFR IDs', () => {
    const content = readSkill('aped-arch');
    expect(content).toMatch(/citing the specific PRD FR\/NFR IDs/);
    expect(content).toMatch(/Decisions without FR\/NFR citations are vibes/);
  });

  it('aped-dev TDD section requires tests to trace to ACs and FR/NFR IDs', () => {
    const content = readSkill('aped-dev');
    expect(content).toMatch(/FR\/NFR grounding/i);
    expect(content).toMatch(/trace back to a specific AC/);
  });
});

// 4.3.0 — P1 arch→epics conditional hard-stop.
describe('aped-epics arch hard-stop (4.3.0 — P1)', () => {
  it('declares conditional ✱ for architecture when state.architecture.status == done', () => {
    const content = readSkill('aped-epics');
    expect(content).toMatch(/Architecture.*conditional ✱/);
    expect(content).toMatch(/pipeline\.phases\.architecture\.status/);
    const archSection = content.slice(content.indexOf('For Architecture (conditional'));
    expect(archSection).toMatch(/HALT/);
    expect(archSection).toMatch(/skipped/);
  });
});

// 4.3.0 — P6 auto-mode gate language in aped-claude block template.
describe('aped-claude auto-mode gate (4.3.0 — P6)', () => {
  it('block template declares gates are mandatory regardless of harness auto-mode', () => {
    const content = readSkill('aped-claude');
    expect(content).toMatch(/Gates are mandatory/);
    expect(content).toMatch(/auto-mode/i);
    expect(content).toMatch(/never bypasses APED gates/);
  });
});

// 4.5.0 — H6 running FR coverage matrix surfaced per epic, not only at end.
describe('aped-epics running FR coverage matrix (4.5.0 — H6)', () => {
  const content = readSkill('aped-epics');

  it('declares a Running FR coverage matrix subsection', () => {
    expect(content).toMatch(/Running FR coverage matrix/i);
    expect(content).toMatch(/[Ee]nd of every epic/);
  });

  it('declares the three trigger points for the running matrix', () => {
    expect(content).toMatch(/[Ee]nd of every epic/);
    expect(content).toMatch(/≥\s?3 stories/);
    expect(content).toMatch(/30%.*uncovered/);
    expect(content).toMatch(/50%.*drafted/);
  });

  it('FRs covered bullet requires explicit FR IDs (no vague descriptions)', () => {
    const m = content.match(/\*\*FRs covered\*\*[^\n]+/);
    expect(m, 'FRs covered bullet present').not.toBeNull();
    expect(m[0]).toMatch(/explicit FR IDs/);
    expect(m[0]).toMatch(/FR-1, FR-3, FR-7/);
  });
});

// 4.5.0 — H8 Doc Freshness Audit in aped-context.
describe('aped-context Doc Freshness Audit (4.5.0 — H8)', () => {
  const content = readSkill('aped-context');

  it('declares a Phase 5 Doc Freshness Audit section', () => {
    expect(content).toMatch(/Phase 5: Doc Freshness Audit/);
  });

  it('classifies docs into fresh / stale / unknown', () => {
    const section = content.slice(content.indexOf('Phase 5: Doc Freshness Audit'));
    expect(section).toMatch(/`fresh`/);
    expect(section).toMatch(/`stale`/);
    expect(section).toMatch(/`unknown`/);
    expect(section).toMatch(/30 days/);
  });

  it('Self-review checklist gains a doc-freshness gate', () => {
    expect(content).toMatch(/Doc freshness classified/);
  });

  it('declares the downstream-skill behaviour on stale docs', () => {
    const section = content.slice(content.indexOf('Phase 5: Doc Freshness Audit'));
    expect(section).toMatch(/MUST NOT treat this doc as source-of-truth/);
    expect(section).toMatch(/refresh|historical context|override/);
  });
});
