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
  'aped-debug.md',
);

// Phase 1 contract for the aped-debug refonte: structure follows Pocock's
// 6-phase diagnosis loop, the load-bearing APED additions stay
// (3-failed-fixes rule, Invocation contexts, [DEBUG-XXXX] tag convention),
// and the new handoff to aped-arch-audit (Phase 6) is documented.
describe('aped-debug skill contract', () => {
  const content = readFileSync(SKILL_PATH, 'utf-8');

  it('preserves the frontmatter contract for callers', () => {
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    expect(match, 'frontmatter block exists').toBeTruthy();
    const frontmatter = match[1];

    // name MUST stay aped-debug -- aped-dev and aped-review reach this
    // skill by name; renaming would break both callers.
    expect(frontmatter).toMatch(/^name:\s*aped-debug\s*$/m);
    expect(frontmatter).toMatch(/^keep-coding-instructions:\s*true\s*$/m);
    // Description still triggers on the canonical phrases. Pocock-style
    // additions ("diagnose", "feedback loop", "hypothesise") may appear
    // alongside the original triggers.
    expect(frontmatter).toMatch(/debug/i);
    expect(frontmatter).toMatch(/troubleshoot/i);
    expect(frontmatter).toMatch(/feedback loop/i);
  });

  it('carries the new Iron Law verbatim', () => {
    expect(content).toMatch(
      /\*\*THE FEEDBACK LOOP IS THE SKILL\.\*\*/,
    );
  });

  it('declares all six phase headings in Pocock order', () => {
    // Strict order check: Phase 1 must precede Phase 2, etc. Indexes are
    // measured against the file's own offset markers.
    const phaseRegexes = [
      /## Phase 1 — Build the feedback loop/,
      /## Phase 2 — Reproduce/,
      /## Phase 3 — Hypothesise/,
      /## Phase 4 — Instrument/,
      /## Phase 5 — Fix \+ regression test/,
      /## Phase 6 — Cleanup \+ post-mortem/,
    ];
    let lastIndex = -1;
    for (const re of phaseRegexes) {
      const match = content.search(re);
      expect(
        match,
        `phase heading matching ${re} must be present`,
      ).toBeGreaterThan(-1);
      expect(
        match,
        `phase headings must appear in order; ${re} appeared before a previous phase`,
      ).toBeGreaterThan(lastIndex);
      lastIndex = match;
    }
  });

  it('names the [DEBUG-XXXX] instrumentation tag convention', () => {
    // Phase 4 must explain the tag convention with at least one example
    // and instruct cleanup at Phase 6.
    expect(content).toMatch(/\[DEBUG-/);
    expect(content).toMatch(/Phase 6/);
    // grep-cleanup instruction must be present (any of the documented
    // phrasings is fine).
    expect(content).toMatch(/grep.*\[DEBUG-/);
  });

  it('hands off architectural findings to aped-arch-audit', () => {
    // Phase 6 (or its sibling Handoff) must recommend aped-arch-audit
    // when the bug reveals architectural friction. The recommendation
    // is the new feature in this refonte.
    expect(content).toMatch(/aped-arch-audit/);
    // The "no correct seam is itself the finding" routing must be
    // present in Phase 5 -- it's the explicit hand-off trigger.
    expect(content).toMatch(/no correct seam/i);
  });

  it('preserves the 3-failed-fixes rule', () => {
    // The rule is APED-specific (not in Pocock) and load-bearing for
    // aped-dev and aped-review. It must survive the refonte.
    expect(content).toMatch(/3-failed-fixes/);
    expect(content).toMatch(/three.*attempts.*not.*green/i);
  });
});
