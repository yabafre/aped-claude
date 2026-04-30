// Superpowers Tier 7 absorption — locks the four 4.11.0 skill-body
// disciplines so future copy-edits don't silently drop them.
//
// Refs (superpowers issues, all closed by Jesse 2026-04 and absorbed here):
//   #1098 — brainstorm assumptions/unknowns explicit blocks
//   #1233 — verbatim quote spec UX contracts directly above code/tests
//   #1234 — Step 0 "quote current symbols" before designing
//   #1266 — brainstorm pre-recommendation grounding (assumptions / failure
//           modes / disqualifiers / evidence-basis per option)
//   #1294 — brainstorm successor enforcement on deferrals
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

describe('superpowers Tier 7 absorption (4.11.0)', () => {
  describe('aped-brainstorm', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-brainstorm.md'), 'utf8');

    it('Phase 4 Convergence requires per-survivor grounding table (#1266)', () => {
      expect(content).toMatch(/Ground each survivor before recommending/);
      expect(content).toMatch(/\| \*\*Assumptions\*\* \|/);
      expect(content).toMatch(/\| \*\*Failure modes\*\* \|/);
      expect(content).toMatch(/\| \*\*Disqualifiers\*\* \|/);
      expect(content).toMatch(/\| \*\*Evidence basis\*\* \|/);
      expect(content).toMatch(/"Strong intuition" is NOT a basis/);
    });

    it('Phase 4 GATE escalates "first principles" survivors to aped-grill (#1266)', () => {
      expect(content).toMatch(/aped-grill[`\s]+before downstream PRD\/arch/);
    });

    it('Phase 5 Output requires Assumptions in play + Unknowns surfaced + Out of scope blocks (#1098)', () => {
      expect(content).toMatch(/## Assumptions in play/);
      expect(content).toMatch(/## Unknowns surfaced/);
      expect(content).toMatch(/## Out of scope \(declared during brainstorm\)/);
    });

    it('Phase 5 Output requires per-survivor Assumptions/Failure modes/Disqualifiers/Evidence basis (#1266 + #1098)', () => {
      // The output template's Top Survivors section must echo the
      // grounding table fields.
      expect(content).toMatch(/Assumptions: \.\.\./);
      expect(content).toMatch(/Failure modes: \.\.\./);
      expect(content).toMatch(/Disqualifiers: \.\.\./);
      expect(content).toMatch(/Evidence basis: \.\.\./);
    });

    it('Placeholder scan rejects bare deferrals without successors (#1294)', () => {
      expect(content).toMatch(/superpowers issue #1294/);
      expect(content).toMatch(/drift through unowned deferrals/);
      expect(content).toMatch(/Every deferral must name \*\*who or what\*\* answers it/);
    });

    it('downstream PRD/arch agents are warned not to treat absent block as "no assumptions"', () => {
      expect(content).toMatch(/must not.*treat an absent block as "no assumptions"/);
    });
  });

  describe('aped-story', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-story.md'), 'utf8');

    it('Step 0 "Quote current symbols" runs before File structure design (#1234)', () => {
      expect(content).toMatch(/## Step 0: Quote current symbols/);
      expect(content).toMatch(/superpowers issue #1234/);
      // Step 0 must come BEFORE the File structure design section.
      const step0Index = content.indexOf('## Step 0: Quote current symbols');
      const fileDesignIndex = content.indexOf('## File structure design');
      expect(step0Index).toBeGreaterThan(0);
      expect(fileDesignIndex).toBeGreaterThan(step0Index);
    });

    it('Step 0 explicitly forbids silent skip on greenfield', () => {
      const content = readFileSync(join(SKILLS_DIR, 'aped-story.md'), 'utf8');
      expect(content).toMatch(/Existing code: none — this is a new file/);
      expect(content).toMatch(/Do not skip Step 0 silently/);
    });
  });

  describe('aped-dev', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-dev.md'), 'utf8');

    it('TDD section requires verbatim spec-quote above tests/code (#1233)', () => {
      expect(content).toMatch(/Verbatim spec-quote rule/);
      expect(content).toMatch(/superpowers issue #1233/);
      expect(content).toMatch(/paste the \*\*literal AC text\*\* as a comment/);
    });

    it('verbatim quote example is concrete (not just prose)', () => {
      const content = readFileSync(join(SKILLS_DIR, 'aped-dev.md'), 'utf8');
      expect(content).toMatch(/AC-3 \(verbatim from story 1-2-jwt:42\)/);
    });

    it('vague AC fallback points to aped-story --refine, not paraphrasing', () => {
      const content = readFileSync(join(SKILLS_DIR, 'aped-dev.md'), 'utf8');
      expect(content).toMatch(/that's a story bug.*aped-story --refine/);
      expect(content).toMatch(/rather than inventing your own clearer wording/);
    });
  });
});
