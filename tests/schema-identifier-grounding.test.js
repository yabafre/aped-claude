// Schema-identifier grounding lint.
//
// Pocock workshop L1858-1866: agent invented a `point_events` table never
// mentioned in any PRD/story. 4.8.0 makes the discipline explicit in the
// skill body. This lint locks the discipline so it cannot be silently dropped.
//
// 6.0.0: skills moved from flat aped-X.md to aped-X/{SKILL.md, workflow.md, steps/...}.
// readSkillContent returns the concatenated body of the entire skill.
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkillContent } from './_helpers/resolve-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

describe('schema-identifier grounding (Pocock workshop L1858 absorption)', () => {
  it('aped-dev RED phase mandates verbatim grep of upstream story/PRD before identifier writes', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-dev');
    expect(content).toMatch(/Schema-identifier grounding/);
    expect(content).toMatch(/grep the upstream story file and PRD/);
    expect(content).toMatch(/HALT and ask the user/);
    expect(content).toMatch(/never invent/);
  });

  it('aped-dev Red Flags table includes the "Tests pass on first run" anti-pattern (RED-witness)', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-dev');
    expect(content).toMatch(/Tests pass on first run/);
    expect(content).toMatch(/no RED was witnessed/i);
  });

  it('aped-dev RED phase requires the `Confirmed RED:` token format', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-dev');
    expect(content).toMatch(/Confirmed RED:/);
    expect(content).toMatch(/<test-name> failed at <file:line>/);
  });

  it('aped-review fresh-context block has the hard-stop on shared-session reviews', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-review');
    expect(content).toMatch(/Fresh-context hard stop/i);
    expect(content).toMatch(/abort immediately/);
    expect(content).toMatch(/Run `\/clear`/);
  });

  it('aped-checkpoint has a drift-trigger section before summary', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-checkpoint');
    expect(content).toMatch(/Drift triggers — read your own last 5 turns/);
    expect(content).toMatch(/Wrong artefact location/);
    expect(content).toMatch(/Horizontal slice/);
    expect(content).toMatch(/Wrong-backend invocation/);
    expect(content).toMatch(/Test-pass without RED witness/);
    expect(content).toMatch(/Schema\/identifier invention/);
  });

  it('aped-checkpoint state.yaml read has explicit fallback for absent state', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-checkpoint');
    expect(content).toMatch(/If state\.yaml is absent/);
    expect(content).toMatch(/pre-pipeline checkpoint/);
    expect(content).toMatch(/do not invent a phase/);
  });

  it('aped-grill skill exists with Pocock-style stop conditions', () => {
    const content = readSkillContent(SKILLS_DIR, 'aped-grill');
    expect(content).toMatch(/^name: aped-grill$/m);
    expect(content).toMatch(/disable-model-invocation: true/);
    expect(content).toMatch(/Stop conditions/);
    expect(content).toMatch(/No new meaningful question for two consecutive turns/);
    expect(content).toMatch(/Token budget exceeds 25k/);
    expect(content).toMatch(/User says "stop"/);
    expect(content).toMatch(/grill-summary\.md/);
  });
});
