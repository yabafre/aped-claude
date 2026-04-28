import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

describe('Spec-reviewer dispatch contract (Tier 5)', () => {
  for (const skill of ['aped-prd', 'aped-ux', 'aped-epics', 'aped-analyze']) {
    it(`${skill} contains '### Spec-reviewer dispatch' heading`, () => {
      const content = readFileSync(join(SKILLS_DIR, `${skill}.md`), 'utf8');
      expect(content).toMatch(/^### Spec-reviewer dispatch$/m);
    });
    it(`${skill} dispatch references the Agent tool`, () => {
      const content = readFileSync(join(SKILLS_DIR, `${skill}.md`), 'utf8');
      expect(content).toMatch(/`Agent` tool/);
    });
    it(`${skill} dispatch prompt includes Status: Approved | Issues Found`, () => {
      const content = readFileSync(join(SKILLS_DIR, `${skill}.md`), 'utf8');
      // Allow optional markdown bold (**) around `Status:` and around the
      // value tokens, since the lifted brainstorm template uses
      // `**Status:** Approved | Issues Found`. Colon is REQUIRED — this
      // is the canonical reviewer output format and the regex must lock
      // it (a template that drops the colon is a contract violation,
      // not an acceptable variation).
      expect(content).toMatch(/(?:\*\*)?Status:(?:\*\*)?\s+(?:\*\*)?Approved(?:\*\*)?\s*\|\s*(?:\*\*)?Issues Found(?:\*\*)?/);
    });
    it(`${skill} Self-review block contains the 'Spec-reviewer dispatched' item`, () => {
      const content = readFileSync(join(SKILLS_DIR, `${skill}.md`), 'utf8');
      expect(content).toMatch(/Spec-reviewer dispatched/);
    });
  }
});
