import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = join(
  __dirname,
  '..',
  'src',
  'templates',
  'skills',
  'aped-arch-audit.md',
);

// Phase 1 contract for aped-arch-audit: standard APED frontmatter, the
// canonical Iron Law, the full vocabulary (translation of Pocock's
// LANGUAGE.md), the Disposition vs aped-arch boundary, and the four
// dependency categories from DEEPENING.md. The skill is monolithic in
// Phase 1 -- a Phase 2 split into LANGUAGE / DEEPENING / INTERFACE-DESIGN
// companions will require updating this test to follow the new layout.
describe('aped-arch-audit skill contract', () => {
  const content = readFileSync(SKILL_PATH, 'utf-8');

  it('declares the required frontmatter keys', () => {
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    expect(match, 'frontmatter block exists').toBeTruthy();
    const frontmatter = match[1];

    expect(frontmatter).toMatch(/^name:\s*aped-arch-audit\s*$/m);
    expect(frontmatter).toMatch(/^keep-coding-instructions:\s*true\s*$/m);
    expect(frontmatter).toMatch(/^license:\s*MIT\s*$/m);
    // Description triggers must include the canonical phrases the spec
    // promised the skill would route on.
    expect(frontmatter).toMatch(/audit architecture/i);
    expect(frontmatter).toMatch(/shallow modules/i);
    expect(frontmatter).toMatch(/deletion test/i);
  });

  it('carries the Iron Law verbatim', () => {
    // The Iron Law constrains the skill to producing a report only.
    // Future edits must not weaken it into prose.
    expect(content).toMatch(
      /\*\*SURFACE CANDIDATES, NEVER AUTO-REFACTOR\.\*\*/,
    );
  });

  it('declares the full vocabulary (8 terms + deletion test + forbidden synonyms)', () => {
    // Vocabulary is the discipline this skill enforces. All eight terms
    // must be defined, the deletion test must be stated as a one-line
    // litmus, and the four forbidden synonyms must be explicit.
    const terms = [
      'Module',
      'Interface',
      'Implementation',
      'Depth',
      'Seam',
      'Adapter',
      'Leverage',
      'Locality',
    ];
    for (const term of terms) {
      expect(
        content,
        `vocabulary term "${term}" must be defined`,
      ).toMatch(new RegExp(`\\*\\*${term}\\*\\*`));
    }
    // The deletion test as a one-line litmus.
    expect(content).toMatch(/If I deleted this module/);
    // Forbidden synonyms (must NOT use these words for the listed concepts).
    expect(content).toMatch(/component/);
    expect(content).toMatch(/service/);
    expect(content).toMatch(/boundary/);
  });

  it('declares the Disposition vs `aped-arch` section', () => {
    // The boundary between aped-arch (decide new architecture) and
    // aped-arch-audit (audit existing) is non-obvious and must stay
    // documented.
    expect(content).toMatch(/## Disposition vs `aped-arch`/);
    // The output filename must be architecture-audit.md, never
    // architecture.md (which is aped-arch's territory).
    expect(content).toMatch(/architecture-audit\.md/);
  });

  it('names all four dependency categories from DEEPENING', () => {
    // The four categories drive the testing strategy for each candidate;
    // omitting any one ships an incomplete classification.
    expect(content).toMatch(/In-process/);
    expect(content).toMatch(/Local-substitutable/);
    expect(content).toMatch(/Remote but owned/);
    expect(content).toMatch(/True external/);
    // Seam discipline rule -- one adapter vs two.
    expect(content).toMatch(/One adapter means a hypothetical seam/);
  });
});
