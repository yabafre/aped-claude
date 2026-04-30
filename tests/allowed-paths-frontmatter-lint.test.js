// allowed-paths frontmatter lint (v5.0.0) — enforces that every top-level
// aped-*.md skill has an allowed-paths field with write and read-only arrays.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = join(import.meta.dirname, '..', 'src', 'templates', 'skills');

function getSkills() {
  return readdirSync(SKILLS_DIR)
    .filter((f) => f.startsWith('aped-') && f.endsWith('.md'))
    .map((f) => ({ file: f, content: readFileSync(join(SKILLS_DIR, f), 'utf-8') }));
}

const SKILLS = getSkills();

describe('allowed-paths frontmatter lint (v5.0.0)', () => {
  for (const { file, content } of SKILLS) {
    it(`${file} has allowed-paths frontmatter`, () => {
      expect(content).toMatch(/^allowed-paths:/m);
    });

    it(`${file} allowed-paths has write array`, () => {
      expect(content).toMatch(/^\s+write:\s*\[/m);
    });

    it(`${file} allowed-paths has read-only array`, () => {
      expect(content).toMatch(/^\s+read-only:\s*\[/m);
    });
  }
});
