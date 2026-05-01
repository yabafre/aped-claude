// Superpowers Tier 7 absorption — locks the four 4.11.0 skill-body
// disciplines so future copy-edits don't silently drop them.
//
// 6.0.0: skills moved from flat aped-X.md to aped-X/{SKILL.md, workflow.md, steps/...}.
// readSkillContent returns the concatenated body of the entire skill.
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkillContent } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

describe('superpowers Tier 7 absorption (4.11.0)', () => {
  describe('aped-brainstorm', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-brainstorm');

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
      expect(content).toMatch(/Assumptions: \.\.\./);
      expect(content).toMatch(/Failure modes: \.\.\./);
      expect(content).toMatch(/Disqualifiers: \.\.\./);
      expect(content).toMatch(/Evidence basis: \.\.\./);
    });

    it('Placeholder scan rejects bare deferrals without successors (#1294)', () => {
      expect(content).toMatch(/Every deferral must name \*\*who or what\*\* answers it/);
    });

    it('downstream PRD/arch agents are warned not to treat absent block as "no assumptions"', () => {
      expect(content).toMatch(/must not.*treat an absent block as "no assumptions"/);
    });
  });

  describe('aped-story', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-story');

    it('Step 0 "Quote current symbols" runs before File structure design (#1234)', () => {
      expect(content).toMatch(/Quote current symbols/);
      // Step 0 must come BEFORE the File structure design section.
      const step0Index = content.indexOf('Quote current symbols');
      const fileDesignIndex = content.indexOf('File structure design');
      expect(step0Index).toBeGreaterThan(0);
      expect(fileDesignIndex).toBeGreaterThan(step0Index);
    });

    it('Step 0 explicitly forbids silent skip on greenfield', () => {
      expect(content).toMatch(/Existing code: none — this is a new file/);
      expect(content).toMatch(/Do not skip Step 0 silently/);
    });
  });

  describe('aped-dev', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-dev');

    it('TDD section requires verbatim spec-quote above tests/code (#1233)', () => {
      expect(content).toMatch(/Verbatim spec-quote rule/i);
      expect(content).toMatch(/paste the \*\*literal AC text\*\* as a comment/);
    });

    it('verbatim quote example is concrete (not just prose)', () => {
      expect(content).toMatch(/AC-3 \(verbatim from story 1-2-jwt:42\)/);
    });

    it('vague AC fallback points to aped-story refine, not paraphrasing', () => {
      // 6.0.0: skill body says "re-running aped-story rather than inventing your own clearer wording".
      expect(content).toMatch(/aped-story/);
      expect(content).toMatch(/rather than inventing your own clearer wording/);
    });
  });
});
