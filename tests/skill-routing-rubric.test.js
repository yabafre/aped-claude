// NL routing rubric (4.14.0) — deterministic verification that each expected
// trigger phrase has at least one skill with that substring in its description.
// No model invocation — pure frontmatter shape check.
//
// 6.0.0: skills moved from flat aped-X.md to aped-X/SKILL.md.
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { resolveSkillEntries } from './_helpers/resolve-skills.js';

const SKILLS_DIR = join(import.meta.dirname, '..', 'src', 'templates', 'skills');

function getSkillDescriptions() {
  return resolveSkillEntries(SKILLS_DIR).map(({ name, content }) => {
    const descMatch = content.match(/^description:\s*(.+)$/m);
    return { name, description: descMatch ? descMatch[1].toLowerCase() : '' };
  });
}

const SKILLS = getSkillDescriptions();

const ROUTING_RUBRIC = [
  { phrase: 'diff', expectedSkill: 'aped-checkpoint' },
  { phrase: 'checkpoint', expectedSkill: 'aped-checkpoint' },
  { phrase: 'tdd', expectedSkill: 'aped-dev' },
  { phrase: 'unit test', expectedSkill: 'aped-dev' },
  { phrase: 'umbrella', expectedSkill: 'aped-ship' },
  { phrase: 'sprint', expectedSkill: 'aped-ship' },
  { phrase: 'pr comment', expectedSkill: 'aped-receive-review' },
  { phrase: 'review comment', expectedSkill: 'aped-receive-review' },
  { phrase: 'grill', expectedSkill: 'aped-grill' },
  { phrase: 'align', expectedSkill: 'aped-grill' },
  { phrase: 'ticket', expectedSkill: 'aped-from-ticket' },
  { phrase: 'linear', expectedSkill: 'aped-from-ticket' },
  { phrase: 'zoom out', expectedSkill: 'aped-zoom-out' },
  { phrase: 'right problem', expectedSkill: 'aped-zoom-out' },
  { phrase: 'debug', expectedSkill: 'aped-debug' },
  { phrase: 'prd', expectedSkill: 'aped-prd' },
  { phrase: 'generate prd', expectedSkill: 'aped-prd' },
  { phrase: 'architecture', expectedSkill: 'aped-arch' },
  { phrase: 'epic', expectedSkill: 'aped-epics' },
  { phrase: 'story', expectedSkill: 'aped-story' },
  { phrase: 'brainstorm', expectedSkill: 'aped-brainstorm' },
  { phrase: 'status', expectedSkill: 'aped-status' },
  { phrase: 'review', expectedSkill: 'aped-review' },
  { phrase: 'triage', expectedSkill: 'aped-triage' },
  { phrase: 'draft requirements', expectedSkill: 'aped-prd' },
  { phrase: 'system design', expectedSkill: 'aped-arch' },
  { phrase: 'small change', expectedSkill: 'aped-quick' },
];

describe('NL routing rubric (4.14.0)', () => {
  it('every expected skill exists', () => {
    const expectedSkills = [...new Set(ROUTING_RUBRIC.map((r) => r.expectedSkill))];
    const existingNames = SKILLS.map((s) => s.name);
    for (const skill of expectedSkills) {
      expect(existingNames).toContain(skill);
    }
  });

  for (const { phrase, expectedSkill } of ROUTING_RUBRIC) {
    it(`"${phrase}" routes to ${expectedSkill}`, () => {
      const target = SKILLS.find((s) => s.name === expectedSkill);
      expect(target, `${expectedSkill} not found`).toBeDefined();
      expect(
        target.description.includes(phrase.toLowerCase()),
        `${expectedSkill} description does not contain "${phrase}". Description: "${target.description}"`,
      ).toBe(true);
    });
  }
});
