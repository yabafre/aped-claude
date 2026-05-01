import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkillContent } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

describe('Spec-reviewer dispatch contract (Tier 5)', () => {
  for (const skill of ['aped-prd', 'aped-ux', 'aped-epics', 'aped-analyze']) {
    it(`${skill} contains 'Spec-reviewer dispatch' heading`, () => {
      const content = readSkillContent(SKILLS_DIR, skill);
      // Allow heading at any markdown level (## or ###) — the BMAD step files
      // use `## SPEC-REVIEWER DISPATCH` while older monolithic skills used `###`.
      expect(content).toMatch(/^#{2,3}\s+(SPEC-REVIEWER DISPATCH|Spec-reviewer dispatch)$/im);
    });
    it(`${skill} dispatch references the Agent tool`, () => {
      const content = readSkillContent(SKILLS_DIR, skill);
      expect(content).toMatch(/`Agent` tool/);
    });
    it(`${skill} dispatch prompt includes Status: Approved | Issues Found`, () => {
      const content = readSkillContent(SKILLS_DIR, skill);
      expect(content).toMatch(/(?:\*\*)?Status:(?:\*\*)?\s+(?:\*\*)?Approved(?:\*\*)?\s*\|\s*(?:\*\*)?Issues Found(?:\*\*)?/);
    });
    it(`${skill} Self-review block contains the 'Spec-reviewer dispatched' item`, () => {
      const content = readSkillContent(SKILLS_DIR, skill);
      expect(content).toMatch(/Spec-reviewer dispatched/);
    });
  }
});
