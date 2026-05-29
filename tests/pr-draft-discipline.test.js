// PR creation discipline (6.12.4, body shape revised 6.13.1):
// every `gh pr create` / `glab mr create` invocation that the skill prints
// or runs MUST pass `--draft`, and `writing-discipline.md` MUST document the
// five-section body shape (Summary / Problems / Solution / Verification / Notes)
// + the "no project jargon" rule (including the banned words AC / story /
// umbrella / baseline / FR) so a reviewer unfamiliar with this codebase can
// read the body without a glossary.
//
// This sentinel prevents regressions where someone re-introduces a
// non-draft PR creation, or strips the structured-body guidance back to a
// 3–6 bullets shape.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS = join(__dirname, '..', 'src', 'templates', 'skills');

function read(rel) {
  return readFileSync(join(SKILLS, rel), 'utf8');
}

// Every shipped path where the skill prints or runs `gh pr create` /
// `glab mr create`. The recovery / probe-and-edit `gh pr edit` calls are
// excluded — they touch an existing PR's content, not creation.
const SITES = [
  'aped-quick/SKILL.md.tmpl',
  'aped-dev/steps/step-08-completion.md',
  'aped-review/steps/step-05-finalize.md',
  'aped-ship/workflow.md.tmpl',
];

describe('PR creation always opens as draft', () => {
  it.each(SITES)('%s — every `gh pr create` invocation carries --draft', (path) => {
    const body = read(path);
    // Match invocations with at least one flag (`--`) or an explicit argument,
    // so bare prose like "...print the `gh pr create` command..." is skipped.
    // We greedily consume the rest of the logical command (same line plus any
    // `\` line continuations) so multi-line invocations are inspected as a
    // single unit.
    const matches = [...body.matchAll(/gh pr create\s+-[^\n`]*(?:\\\n[^\n`]*)*/g)];
    expect(matches.length, `${path}: expected at least one \`gh pr create\` invocation with flags`).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m[0], `${path}: \`gh pr create\` without --draft: ${m[0]}`).toMatch(/--draft\b/);
    }
  });

  it.each(SITES.filter((p) => /aped-quick|aped-dev/.test(p)))(
    '%s — every `glab mr create` invocation carries --draft',
    (path) => {
      const body = read(path);
      const matches = [...body.matchAll(/glab mr create\s+-[^\n`]*(?:\\\n[^\n`]*)*/g)];
      // Some skills only mention GitLab as a parenthetical — skip if absent.
      if (matches.length === 0) return;
      for (const m of matches) {
        expect(m[0], `${path}: \`glab mr create\` without --draft: ${m[0]}`).toMatch(/--draft\b/);
      }
    },
  );
});

describe('writing-discipline documents the five-section PR body shape', () => {
  const wd = read('aped-skills/writing-discipline.md');

  it('mentions --draft as the creation default', () => {
    expect(wd).toMatch(/`--draft`/);
    expect(wd).toMatch(/\bgh pr ready\b/);
  });

  it('describes the Summary / Problems / Solution / Verification shape', () => {
    expect(wd).toMatch(/##\s*Summary/);
    expect(wd).toMatch(/##\s*Problems/);
    expect(wd).toMatch(/##\s*Solution/);
    expect(wd).toMatch(/##\s*Verification/);
    expect(wd).toMatch(/##\s*Notes/);
  });

  it('does not re-introduce the legacy themed / Tests / Validation shape', () => {
    expect(wd).not.toMatch(/##\s*Tests\b/);
    expect(wd).not.toMatch(/##\s*Validation\b/);
  });

  it('forbids project-internal jargon in PR bodies', () => {
    // Either the literal phrase "no project-internal jargon" or a clear
    // equivalent ("reader unfamiliar"). We accept any text that names the
    // intent — this is a guard against the section being stripped.
    expect(wd).toMatch(/(project[-\s]internal jargon|unfamiliar.+codebase|grasp the change)/i);
  });

  it('names the banned jargon words (AC / story / umbrella / baseline / FR)', () => {
    for (const term of ['AC', 'story', 'umbrella', 'baseline', 'FR']) {
      expect(wd, `banned term not documented: ${term}`).toMatch(new RegExp(`\`${term}\``));
    }
  });
});
