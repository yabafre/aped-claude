import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'src', 'templates', 'skills');

const skillFiles = readdirSync(SKILLS_DIR)
  .filter((f) => f.startsWith('aped-') && f.endsWith('.md'))
  .map((f) => ({ name: f, content: readFileSync(join(SKILLS_DIR, f), 'utf8') }));

// 4.3.0 contract — every skill's frontmatter `description:` must be safely
// parsed by Claude Code's YAML loader. Two known footguns:
// 1) Unquoted value containing `: ` is parsed as a nested mapping; the skill
//    silently fails to register (Superpowers #955).
// 2) Empty description never routes.
//
// We require every description to be wrapped in single/double quotes (or a
// folded-scalar block, though APED currently uses single quotes).
describe('skill frontmatter description lint (4.3.0 — H3)', () => {
  it('returns at least 27 skill files (sanity)', () => {
    expect(skillFiles.length).toBeGreaterThanOrEqual(27);
  });

  it.each(skillFiles.map((s) => [s.name, s]))(
    '%s: description is properly quoted',
    (_name, skill) => {
      const m = skill.content.match(/^description:\s*(\S.*?)\s*$/m);
      expect(m, `${_name} has a description: line`).not.toBeNull();
      const value = m[1];
      const isFoldedScalar = value === '>' || value === '|';
      const startsQuoted = value[0] === "'" || value[0] === '"';
      const endsQuoted = value[value.length - 1] === "'" || value[value.length - 1] === '"';
      expect(
        isFoldedScalar || (startsQuoted && endsQuoted),
        `${_name}: description must be quoted (single, double, or folded scalar). Got: ${value}`,
      ).toBe(true);
    },
  );

  it.each(skillFiles.map((s) => [s.name, s]))(
    '%s: description body is non-trivial',
    (_name, skill) => {
      const m = skill.content.match(/^description:\s*['"](.+?)['"]\s*$/m);
      expect(m, `${_name} description must be quoted single-line and non-empty`).not.toBeNull();
      expect(m[1].length, `${_name} description body too short`).toBeGreaterThan(20);
    },
  );
});
