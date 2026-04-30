// Schema-identifier grounding lint.
//
// Pocock workshop L1858-1866: agent invented a `point_events` table never
// mentioned in any PRD/story. Detection mechanism that day was manual QA
// on the running app — by then the migration had already shipped.
//
// 4.8.0 makes the discipline explicit in the skill body: aped-dev RED phase
// requires that any migration / table name / column name / enum value /
// API path be grounded in the upstream story or PRD by literal text match
// before it gets written.
//
// This lint locks the discipline to the skill body so the rule cannot be
// silently dropped in a future refactor. It does NOT exercise live agent
// output — that's a runtime concern out of scope for unit tests.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

describe('schema-identifier grounding (Pocock workshop L1858 absorption)', () => {
  it('aped-dev RED phase mandates verbatim grep of upstream story/PRD before identifier writes', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-dev.md'), 'utf8');

    // The RED block must contain the discipline language. We check the
    // semantic anchors rather than an exact-string match so future
    // copy-edit refactors don't break this test gratuitously.
    expect(content).toMatch(/Schema-identifier grounding/);
    expect(content).toMatch(/grep the upstream story file and PRD/);
    expect(content).toMatch(/HALT and ask the user/);
    expect(content).toMatch(/never invent/);
  });

  it('aped-dev cites Pocock workshop reference for the discipline', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-dev.md'), 'utf8');
    // Reference to the canonical workshop passage (point_events example).
    expect(content).toMatch(/point_events/);
    expect(content).toMatch(/L1858/);
  });

  it('aped-dev Red Flags table includes the "Tests pass on first run" anti-pattern (RED-witness)', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-dev.md'), 'utf8');
    expect(content).toMatch(/Tests pass on first run/);
    expect(content).toMatch(/no RED was witnessed/i);
  });

  it('aped-dev RED phase requires the `Confirmed RED:` token format', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-dev.md'), 'utf8');
    expect(content).toMatch(/Confirmed RED:/);
    expect(content).toMatch(/<test-name> failed at <file:line>/);
  });

  it('aped-review fresh-context block has the hard-stop on shared-session reviews', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-review.md'), 'utf8');
    expect(content).toMatch(/Fresh-context hard stop/);
    expect(content).toMatch(/abort immediately/);
    expect(content).toMatch(/Run `\/clear`/);
    expect(content).toMatch(/L1697/);
  });

  it('aped-checkpoint has a drift-trigger section before summary', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-checkpoint.md'), 'utf8');
    expect(content).toMatch(/Drift triggers — read your own last 5 turns/);
    // The 5 trigger rows must all be present.
    expect(content).toMatch(/Wrong artefact location/);
    expect(content).toMatch(/Horizontal slice/);
    expect(content).toMatch(/Wrong-backend invocation/);
    expect(content).toMatch(/Test-pass without RED witness/);
    expect(content).toMatch(/Schema\/identifier invention/);
  });

  it('aped-checkpoint state.yaml read has explicit fallback for absent state', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-checkpoint.md'), 'utf8');
    expect(content).toMatch(/If state\.yaml is absent/);
    expect(content).toMatch(/pre-pipeline checkpoint/);
    expect(content).toMatch(/do not invent a phase/);
  });

  it('aped-grill skill exists with Pocock-style stop conditions', () => {
    const content = readFileSync(join(SKILLS_DIR, 'aped-grill.md'), 'utf8');
    // Frontmatter discipline
    expect(content).toMatch(/^name: aped-grill$/m);
    expect(content).toMatch(/disable-model-invocation: true/);
    // Stop conditions must be explicit and quoted from the workshop.
    expect(content).toMatch(/Stop conditions/);
    expect(content).toMatch(/No new meaningful question for two consecutive turns/);
    expect(content).toMatch(/Token budget exceeds 25k/);
    expect(content).toMatch(/User says "stop"/);
    // Output artefact path
    expect(content).toMatch(/grill-summary\.md/);
  });
});
